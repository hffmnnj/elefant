import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { Database } from '../db/database.ts'
import { mountWorktreeRoutes } from './routes.ts'

function createTempDbPath(): { dbPath: string; tempDir: string } {
	const tempDir = mkdtempSync(join(tmpdir(), 'elefant-worktree-routes-'))
	return { dbPath: join(tempDir, 'db.sqlite'), tempDir }
}

function jsonRequest(url: string, method: string, body?: unknown): Request {
	return new Request(url, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body !== undefined ? JSON.stringify(body) : undefined,
	})
}

describe('mountWorktreeRoutes', () => {
	it('validates POST payloads with zod', async () => {
		const { dbPath, tempDir } = createTempDbPath()
		const database = new Database(dbPath)
		const app = new Elysia()
		mountWorktreeRoutes(app, { db: database })

		const response = await app.handle(
			jsonRequest('http://localhost/api/projects/p1/worktrees', 'POST', {
				targetPath: '',
				branch: '',
			}),
		)

		expect(response.status).toBe(400)
		const payload = (await response.json()) as {
			ok: boolean
			error: { code: string }
		}
		expect(payload.ok).toBe(false)
		expect(payload.error.code).toBe('VALIDATION_ERROR')

		database.close()
		rmSync(tempDir, { recursive: true, force: true })
	})

	it('returns 404 for unknown projects', async () => {
		const { dbPath, tempDir } = createTempDbPath()
		const database = new Database(dbPath)
		const app = new Elysia()
		mountWorktreeRoutes(app, { db: database })

		const response = await app.handle(
			new Request('http://localhost/api/projects/unknown/worktrees'),
		)

		expect(response.status).toBe(404)
		const payload = (await response.json()) as {
			ok: boolean
			error: { code: string }
		}
		expect(payload.ok).toBe(false)
		expect(payload.error.code).toBe('FILE_NOT_FOUND')

		database.close()
		rmSync(tempDir, { recursive: true, force: true })
	})
})
