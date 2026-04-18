import { describe, expect, it } from 'bun:test'

import type { ElefantConfig } from '../config/schema.ts'
import { HookRegistry } from '../hooks/index.ts'
import { ProviderRouter } from '../providers/router.ts'
import { createToolRegistry } from '../tools/registry.ts'
import { createApp } from './app.ts'

function createTestRouter(): ProviderRouter {
	const config: ElefantConfig = {
		port: 1337,
		logLevel: 'info',
		defaultProvider: 'test-provider',
		providers: [
			{
				name: 'test-provider',
				baseURL: 'https://api.openai.com/v1',
				apiKey: 'test-key',
				model: 'gpt-4o-mini',
				format: 'openai',
			},
		],
	}

	return new ProviderRouter(config)
}

describe('createApp', () => {
	it('GET /health returns 200 with ok: true', async () => {
		const hooks = new HookRegistry()
		const app = createApp(createTestRouter(), createToolRegistry(hooks), hooks)
		const response = await app.handle(new Request('http://localhost/health'))
		const payload = await response.json() as {
			ok: boolean
			status: string
			uptime: number
			timestamp: string
		}

		expect(response.status).toBe(200)
		expect(payload.ok).toBe(true)
		expect(payload.status).toBe('running')
		expect(typeof payload.uptime).toBe('number')
		expect(typeof payload.timestamp).toBe('string')
	})

	it('GET /unknown returns 404', async () => {
		const hooks = new HookRegistry()
		const app = createApp(createTestRouter(), createToolRegistry(hooks), hooks)
		const response = await app.handle(new Request('http://localhost/unknown'))
		const payload = await response.json() as {
			ok: boolean
			error: string
		}

		expect(response.status).toBe(404)
		expect(payload.ok).toBe(false)
		expect(typeof payload.error).toBe('string')
	})

	it('should allow tauri://localhost origin', async () => {
		const hooks = new HookRegistry()
		const app = createApp(createTestRouter(), createToolRegistry(hooks), hooks)
		const response = await app.handle(
			new Request('http://localhost/health', {
				headers: { origin: 'tauri://localhost' },
			})
		)
		expect(response.headers.get('access-control-allow-origin')).toBe('tauri://localhost')
	})
})
