import type { ElefantConfig } from '../config/index.ts'
import { Database } from '../db/database.ts'
import { HookRegistry } from '../hooks/index.ts'
import { ProjectManager } from '../project/manager.ts'
import type { ProjectInfo } from '../project/types.ts'
import { ProviderRouter } from '../providers/router.ts'
import { createApp } from '../server/app.ts'
import { createToolRegistry } from '../tools/registry.ts'
import { sessionManager } from '../tools/shell/index.js'
import type { ElefantError } from '../types/errors.ts'
import { err, ok, type Result } from '../types/result.ts'
import type { DaemonContext } from './context.ts'
import { setGlobalHookRegistry } from './shutdown.ts'

export interface ElefantDaemon {
	start(): Promise<void>
	stop(): Promise<void>
}

function toConfigError(message: string, details?: unknown): ElefantError {
	return {
		code: 'CONFIG_INVALID',
		message,
		details,
	}
}

export async function createDaemon(config: ElefantConfig): Promise<Result<ElefantDaemon, ElefantError>> {
	const hookRegistry = new HookRegistry()
	const toolRegistry = createToolRegistry(hookRegistry)

	let providerRouter: ProviderRouter
	try {
		providerRouter = new ProviderRouter(config)
	} catch (error) {
		return err(
			toConfigError(
				error instanceof Error ? error.message : 'Failed to initialize provider router',
			),
		)
	}

	// A. Bootstrap .elefant/ directory
	const bootstrapResult = await ProjectManager.bootstrap(config.projectPath)
	if (!bootstrapResult.ok) {
		return err(toConfigError('Failed to bootstrap project directory', bootstrapResult.error))
	}
	const projectInfo: ProjectInfo = bootstrapResult.data

	// B. Initialize SQLite database
	const db = new Database(projectInfo.dbPath)

	// C. Build DaemonContext (for later use by StateManager, plugins, etc.)
	// Note: this context will be EXPANDED in future tasks (Wave 2, 3, 4, 5)
	// For now, it holds project + db. Hooks and tools are already created above.
	const context: DaemonContext = {
		config,
		hooks: hookRegistry,
		tools: toolRegistry,
		providers: providerRouter,
		project: projectInfo,
		db,
	}

	const app = createApp(providerRouter, toolRegistry, hookRegistry)

	hookRegistry.register('shutdown', async () => {
		await sessionManager.closeAll()
		db.close()
	})

	setGlobalHookRegistry(hookRegistry)

	return ok({
		start: async () => {
			await app.listen(config.port)
			console.error(`[elefant] Daemon listening on port ${config.port}`)
		},
		stop: async () => {
			await app.stop()
			db.close()
		},
	})
}
