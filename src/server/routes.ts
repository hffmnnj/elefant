import type { Elysia } from 'elysia'

import type { ProviderRouter } from '../providers/router.ts'

export function registerServerRoutes(app: Elysia, providerRouter: ProviderRouter): Elysia {
	void providerRouter
	return app
}
