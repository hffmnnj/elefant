import { Elysia } from 'elysia'

import type { ProviderRouter } from '../providers/router.ts'
import { registerServerRoutes } from './routes.ts'

export function createApp(providerRouter: ProviderRouter): Elysia {
	const app = new Elysia()
		.onError(({ code, error, set }) => {
			set.status = code === 'NOT_FOUND' ? 404 : 500
			return { ok: false, error: String(error) }
		})
		.get('/health', () => ({
			ok: true,
			status: 'running',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
		}))

	return registerServerRoutes(app as unknown as Elysia, providerRouter)
}
