import { describe, expect, it } from 'bun:test'

import { configSchema } from '../config/index.ts'
import { HookRegistry } from '../hooks/index.ts'
import type { ProviderRouter } from '../providers/router.ts'
import type { ProviderAdapter } from '../providers/types.ts'
import { createApp } from '../server/app.ts'
import { ToolRegistry } from '../tools/registry.ts'
import { createMockAdapter, createMockConfig } from './helpers.ts'

function createRouter(adapter: ProviderAdapter): ProviderRouter {
	return {
		getAdapter: () => ({ ok: true, data: adapter }),
		listProviders: () => ['mock-provider'],
	} as unknown as ProviderRouter
}

describe('daemon integration (in-process)', () => {
	it('health endpoint works', async () => {
		const hooks = new HookRegistry()
		const app = createApp(
			createRouter(createMockAdapter([{ type: 'done', finishReason: 'stop' }])),
			new ToolRegistry(hooks),
			hooks,
			// createApp needs a Database; tests that actually exercise routes
			// use their own fixtures. This smoke test only hits /health, which
			// doesn't touch the db. The cast keeps the signature honest
			// without forcing helpers/ to own a real SQLite instance.
			undefined as never,
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
