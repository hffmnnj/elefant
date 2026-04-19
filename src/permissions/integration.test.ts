import { afterEach, describe, expect, it, mock } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Database } from '../db/database.ts'
import type { DaemonContext } from '../daemon/context.ts'
import { HookRegistry } from '../hooks/registry.ts'
import { SseManager } from '../transport/sse-manager.ts'
import type { ElefantWsServer } from '../transport/ws-server.ts'
import { PermissionGate } from './gate.ts'
import type { PermissionDecisionStatus } from './types.ts'

function hookReturn(status: PermissionDecisionStatus, reason?: string) {
	return { status, reason }
}

interface MockApprovalResult {
	approved: boolean
	reason?: string
}

interface MockWs {
	requestApproval: (
		payload: Record<string, unknown>,
		timeoutMs: number,
	) => Promise<MockApprovalResult>
}

const tempDirs: string[] = []

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true })
	}
})

function createMockContext(hooks: HookRegistry, sse?: SseManager): DaemonContext {
	const dbStub = {
		db: {
			query: () => ({
				get: () => null,
				all: () => [],
				run: () => {},
			}),
		},
	}

	return {
		hooks,
		db: dbStub,
		sse: sse ?? {},
	} as unknown as DaemonContext
}

function createMockWs(approvalResult: MockApprovalResult): ElefantWsServer {
	return {
		requestApproval: mock(async () => approvalResult),
		broadcastToRoom: mock(() => {}),
	} as unknown as ElefantWsServer
}

describe('PermissionGate integration', () => {
	it('low-risk tool is auto-approved without WS call', async () => {
		const hooks = new HookRegistry()
		const ctx = createMockContext(hooks)
		const ws = createMockWs({ approved: true })

		const gate = new PermissionGate(ctx, ws)
		const result = await gate.check('read', { path: '/project/file.txt' }, 'conv-1')

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.data.approved).toBe(true)
			expect(result.data.risk).toBe('low')
			expect(result.data.source).toBe('default')
		}
	})

	it('high-risk tool is denied when WS is null', async () => {
		const hooks = new HookRegistry()
		const ctx = createMockContext(hooks)

		const gate = new PermissionGate(ctx, null)
		const result = await gate.check('bash', { command: 'rm -rf /tmp' }, 'conv-2')

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.data.approved).toBe(false)
			expect(result.data.risk).toBe('high')
			expect(result.data.reason).toContain('no WebSocket')
			expect(result.data.source).toBe('default')
		}
	})

	it('permission:ask hook can force allow and bypass WS', async () => {
		const hooks = new HookRegistry()
		hooks.register('permission:ask', () => hookReturn('allow', 'plugin allowlist'))

		const ws: MockWs = {
			requestApproval: mock(async () => ({ approved: false })),
		}

		const gate = new PermissionGate(
			createMockContext(hooks),
			ws as unknown as ElefantWsServer,
		)

		const result = await gate.check('bash', { command: 'echo ok' }, 'conv-3')

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.data.approved).toBe(true)
			expect(result.data.source).toBe('hook')
		}
		expect(ws.requestApproval).toHaveBeenCalledTimes(0)
	})

	it('SSE publishes permission.asked and permission.resolved with matching requestId', async () => {
		const fixture = createSseFixture()
		const hooks = new HookRegistry()
		hooks.register('permission:ask', () => hookReturn('deny', 'planner cannot run bash'))

		const gate = new PermissionGate(createMockContext(hooks, fixture.sse), null)

		const response = fixture.sse.subscribe('proj-1')
		const reader = response.body?.getReader()
		expect(reader).toBeDefined()
		if (!reader) return

		await reader.read()

		await gate.check(
			'bash',
			{ command: 'rm -rf /tmp' },
			'conv-sse',
			{ projectId: 'proj-1', sessionId: 'session-1', agent: 'planner' },
		)

		const events = await collectSseEvents(reader, ['permission.asked', 'permission.resolved'])
		expect(events).toHaveLength(2)

		const asked = events.find((event) => event.event === 'permission.asked')
		const resolved = events.find((event) => event.event === 'permission.resolved')

		expect(asked).toBeDefined()
		expect(resolved).toBeDefined()
		expect((asked?.data as { requestId: string }).requestId).toBe(
			(resolved?.data as { requestId: string }).requestId,
		)

		await reader.cancel()
		fixture.sse.destroy()
		fixture.db.close()
	})
})

function createSseFixture(): { db: Database; sse: SseManager } {
	const dir = mkdtempSync(join(tmpdir(), 'elefant-perm-'))
	tempDirs.push(dir)

	const db = new Database(join(dir, 'db.sqlite'))
	db.db.run('INSERT INTO projects (id, name, path, description) VALUES (?, ?, ?, ?)', [
		'proj-1',
		'Project 1',
		'/tmp/project-1',
		null,
	])
	db.db.run(
		'INSERT INTO sessions (id, project_id, workflow_id, phase, status, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
		['session-1', 'proj-1', null, 'idle', 'running', new Date().toISOString(), null],
	)

	return { db, sse: new SseManager(db) }
}

async function collectSseEvents(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	types: string[],
): Promise<Array<{ event: string; data: unknown }>> {
	const events: Array<{ event: string; data: unknown }> = []
	const pending = new Set(types)
	const deadline = Date.now() + 2_000

	while (pending.size > 0 && Date.now() < deadline) {
		const result = await reader.read()
		if (result.done) {
			break
		}

		const parsed = parseSseChunk(result.value)
		for (const event of parsed) {
			if (!pending.has(event.event)) {
				continue
			}
			events.push(event)
			pending.delete(event.event)
		}
	}

	return events
}

function parseSseChunk(chunk: Uint8Array): Array<{ event: string; data: unknown }> {
	const text = new TextDecoder().decode(chunk)
	const rawEvents = text.split('\n\n').filter((segment) => segment.trim().length > 0)

	const events: Array<{ event: string; data: unknown }> = []
	for (const raw of rawEvents) {
		const lines = raw.split('\n')
		let event = ''
		let data = '{}'

		for (const line of lines) {
			if (line.startsWith('event: ')) {
				event = line.slice('event: '.length)
			} else if (line.startsWith('data: ')) {
				data = line.slice('data: '.length)
			}
		}

		if (event.length === 0) {
			continue
		}

		events.push({ event, data: parseJson(data) })
	}

	return events
}

function parseJson(raw: string): unknown {
	try {
		return JSON.parse(raw)
	} catch {
		return {}
	}
}
