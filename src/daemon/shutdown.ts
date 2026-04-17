import { emit, HookRegistry } from '../hooks/index.ts';
import { removePid } from './pid.ts';

let globalHookRegistry: HookRegistry | null = null;
let shutdownInProgress = false;

export function setGlobalHookRegistry(registry: HookRegistry): void {
	globalHookRegistry = registry;
}

export function clearGlobalHookRegistry(): void {
	globalHookRegistry = null;
}

export async function gracefulShutdown(reason: 'SIGTERM' | 'SIGINT' | 'manual'): Promise<void> {
	if (shutdownInProgress) {
		console.error(`[daemon] Shutdown already in progress (${reason})`);
		return;
	}

	shutdownInProgress = true;
	console.error(`[daemon] Starting graceful shutdown. reason=${reason}`);

	if (globalHookRegistry) {
		console.error('[daemon] Emitting shutdown hook');
		await emit(globalHookRegistry, 'shutdown', { reason });
	} else {
		console.error('[daemon] No hook registry registered, skipping shutdown hooks');
	}

	console.error('[daemon] Draining in-flight requests (stub 100ms)');
	await Bun.sleep(100);

	console.error('[daemon] Closing shell sessions (stub)');

	console.error('[daemon] Removing PID file');
	const removeResult = await removePid();
	if (!removeResult.ok) {
		console.error('[daemon] Failed to remove PID file', removeResult.error);
	}

	console.error('[daemon] Shutdown complete, exiting process');
	process.exit(0);
}
