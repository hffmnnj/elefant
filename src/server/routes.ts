import type { Elysia } from 'elysia'

import type { ProviderRouter } from '../providers/router.ts'
import type { Database } from '../db/database.ts'
import { createConfigRoutes } from './config-routes.ts'
import { ConfigManager } from '../config/index.ts'
import { getProjectById } from '../db/repo/projects.ts'
import { err, ok } from '../types/result.ts'

/**
 * Mounts the HTTP routes that live alongside the core daemon services.
 *
 * Historically this also mounted the `/api/chat` SSE endpoint. Chat is now
 * delivered through the per-session agent-runs pipeline in
 * `src/runs/routes.ts`, so this function only wires the config CRUD
 * surface.
 */
export function registerServerRoutes(
	app: Elysia,
	providerRouter: ProviderRouter,
	db: Database,
): Elysia {
	const configManager = new ConfigManager({
		projectPathResolver: (projectId) => {
			const project = getProjectById(db, projectId)
			if (!project.ok) {
				return err(project.error)
			}

			return ok(project.data.path)
		},
	})

	createConfigRoutes(app, providerRouter, configManager)
	return app
}
