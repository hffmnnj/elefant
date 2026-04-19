import { describe, expect, it } from 'bun:test'

import { configSchema } from '../config/index.ts'
import { HookRegistry } from '../hooks/index.ts'
import type { ProviderRouter } from '../providers/router.ts'
import type { ProviderAdapter, StreamEvent } from '../providers/types.ts'
import { createApp } from '../server/app.ts'
import { ToolRegistry } from '../tools/registry.ts'
import { createMockAdapter, createMockConfig } from './helpers.ts'

function createRouter(adapter: ProviderAdapter): ProviderRouter {
	return {
		getAdapter: () => ({ ok: true, data: adapter }),
		listProviders: () => ['mock-provider'],
	} as unknown as ProviderRouter
}

function createJsonRequest(body: unknown): Request {
	return new Request('http://localhost/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

describe('daemon integration (in-process)', () => {
	it('health endpoint works', async () => {
		const hooks = new HookRegistry()
		const app = createApp(
			createRouter(createMockAdapter([{ type: 'done', finishReason: 'stop' }])),
			new ToolRegistry(hooks),
			hooks,
		)

		const response = await app.handle(new Request('http://localhost/health'))
		expect(response.status).toBe(200)

		const payload = (await response.json()) as {
			ok: boolean
			status: string
		}
		expect(payload.ok).toBe(true)
		expect(payload.status).toBe('running')
	})

	it('POST /api/chat returns SSE stream with mocked provider', async () => {
		const hooks = new HookRegistry()
		const adapter = createMockAdapter([
			{ type: 'text_delta', text: 'Hello from adapter' },
			{ type: 'done', finishReason: 'stop' },
		])
		const app = createApp(createRouter(adapter), new ToolRegistry(hooks), hooks)

		const response = await app.handle(
			createJsonRequest({
				messages: [{ role: 'user', content: 'Hi' }],
			}),
		)

		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Type')).toContain('text/event-stream')

		const sseText = await response.text()
		expect(sseText).toContain('event: token\ndata: {"text":"Hello from adapter"}\n\n')
		expect(sseText).toContain('event: done\ndata: {"finishReason":"stop"}\n\n')
	})

	it('agent loop executes tool call when provider requests one', async () => {
		let turn = 0
		const adapter: ProviderAdapter = {
			name: 'mock-provider',
			async *sendMessage(): AsyncGenerator<StreamEvent> {
				turn += 1
				if (turn === 1) {
					yield {
						type: 'tool_call_complete',
						toolCall: {
							id: 'call-1',
							name: 'mock-tool',
							arguments: { value: 'abc' },
						},
					}
					yield { type: 'done', finishReason: 'tool_calls' }
					return
				}

				yield { type: 'text_delta', text: 'final answer' }
				yield { type: 'done', finishReason: 'stop' }
			},
		}

		const hooks = new HookRegistry()
		const registry = new ToolRegistry(hooks)
		registry.register({
			name: 'mock-tool',
			description: 'mock test tool',
			parameters: {},
			execute: async () => ({ ok: true, data: 'mock-result' }),
		})

		const app = createApp(createRouter(adapter), registry, hooks)
		const response = await app.handle(
			createJsonRequest({
				messages: [{ role: 'user', content: 'Use the mock tool' }],
			}),
		)

		expect(response.status).toBe(200)
		const sseText = await response.text()
		expect(sseText).toContain('event: tool_call\ndata: {"id":"call-1","name":"mock-tool","arguments":{"value":"abc"}}\n\n')
		expect(sseText).toContain('event: tool_result\ndata: {"toolCallId":"call-1","content":"mock-result","isError":false}\n\n')
		expect(sseText).toContain('event: token\ndata: {"text":"final answer"}\n\n')
		expect(sseText).toContain('event: done\ndata: {"finishReason":"stop"}\n\n')
	})

	it('invalid request body returns 400', async () => {
		const hooks = new HookRegistry()
		const app = createApp(
			createRouter(createMockAdapter([{ type: 'done', finishReason: 'stop' }])),
			new ToolRegistry(hooks),
			hooks,
		)

		const response = await app.handle(createJsonRequest({ provider: 'mock-provider' }))
		expect(response.status).toBe(400)

		const payload = (await response.json()) as { ok: boolean; error: string }
		expect(payload.ok).toBe(false)
		expect(payload.error).toBe('Invalid request body')
	})

	it('config validation fails when apiKey is missing', () => {
		const config = createMockConfig()
		const invalidConfig = {
			...config,
			providers: [
				{
					...config.providers[0],
					apiKey: '',
				},
			],
		}

		const parsed = configSchema.safeParse(invalidConfig)
		expect(parsed.success).toBe(false)
	})
})
