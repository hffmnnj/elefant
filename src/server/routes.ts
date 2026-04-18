import type { Elysia } from 'elysia'

import type { HookRegistry } from '../hooks/index.ts'
import type { ProviderRouter } from '../providers/router.ts'
import type { ToolRegistry } from '../tools/registry.ts'
import { createConversationRoute } from './conversation.ts'
import { createConfigRoutes } from './config-routes.ts'

export function registerServerRoutes(
	app: Elysia,
	providerRouter: ProviderRouter,
	toolRegistry: ToolRegistry,
	hookRegistry: HookRegistry,
): Elysia {
	createConfigRoutes(app as unknown as Elysia, providerRouter)
	return createConversationRoute(app, providerRouter, toolRegistry, hookRegistry)
}
