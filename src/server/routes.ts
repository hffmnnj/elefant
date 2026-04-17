import type { Elysia } from 'elysia'

import type { HookRegistry } from '../hooks/index.ts'
import type { ProviderRouter } from '../providers/router.ts'
import type { ToolRegistry } from '../tools/registry.ts'
import { createConversationRoute } from './conversation.ts'

export function registerServerRoutes(
	app: Elysia,
	providerRouter: ProviderRouter,
	toolRegistry: ToolRegistry,
	hookRegistry: HookRegistry,
): Elysia {
	return createConversationRoute(app, providerRouter, toolRegistry, hookRegistry)
}
