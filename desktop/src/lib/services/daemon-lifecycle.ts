// Daemon lifecycle service.
//
// Stop:  POST /api/daemon/shutdown  (HTTP — no shell required, no cwd issues)
// Start: bun <absolute-path-to-server-entry.ts>  (Tauri Command.create with absolute path)
//
// Using an absolute path for start avoids the cwd problem entirely —
// Tauri shells out from the app bundle directory, not the project root,
// so relative paths like 'bin/elefant.ts' can never resolve.
//
// The project root path is persisted in settings (settingsStore.daemonProjectPath).
// It defaults to the path auto-detected from the running daemon's /health endpoint,
// or can be set manually in Settings → General.

import { Command } from '@tauri-apps/plugin-shell';
import { getDaemonClient, DAEMON_URL } from '$lib/daemon/client.js';
import { settingsStore } from '$lib/stores/settings.svelte.js';

export type DaemonLifecycleStatus = 'running' | 'stopped' | 'unknown' | 'starting' | 'stopping';

// ─── Stop ────────────────────────────────────────────────────────────────────

/**
 * Stop the daemon via the HTTP shutdown endpoint.
 * No shell command needed — works regardless of cwd.
 */
export async function stopDaemon(): Promise<void> {
	const baseUrl = settingsStore.daemonUrl || DAEMON_URL;
	const response = await fetch(`${baseUrl}/api/daemon/shutdown`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	});
	// 200 means it acknowledged shutdown. Any other status is an error.
	if (!response.ok) {
		const text = await response.text().catch(() => `HTTP ${response.status}`);
		throw new Error(`Daemon shutdown request failed: ${text}`);
	}
}

// ─── Start ───────────────────────────────────────────────────────────────────

/**
 * Derive the absolute path to server-entry.ts from the stored project root.
 * Returns null if the project root is not configured.
 */
function getEntryPath(): string | null {
	const root = settingsStore.daemonProjectPath;
	if (!root) return null;
	// Normalise trailing slash
	const normalised = root.replace(/\/+$/, '');
	return `${normalised}/src/daemon/server-entry.ts`;
}

/**
 * Start the daemon by spawning `bun <absolute-path-to-server-entry.ts>`.
 * The absolute path sidesteps the cwd problem entirely.
 */
export async function startDaemon(): Promise<void> {
	const entryPath = getEntryPath();
	if (!entryPath) {
		throw new Error(
			'Project path not configured. Go to Settings → General and set the Elefant project path.',
		);
	}

	// Command.create('bun', [...]) — 'bun' must match the scope name in
	// capabilities/default.json. We pass the absolute path as the first arg
	// so bun runs it directly, no `run` subcommand needed for a .ts file.
	const command = Command.create('bun', [entryPath]);
	const output = await command.execute();

	// Bun exits 0 only if the process terminates cleanly. For a daemon that
	// stays running, the spawn itself should succeed; if it exits immediately
	// with a non-zero code it's a startup error.
	if (output.code !== null && output.code !== 0) {
		const msg = (output.stderr || output.stdout).trim();
		throw new Error(`Daemon failed to start (exit ${output.code}): ${msg}`);
	}
}

// ─── Status ──────────────────────────────────────────────────────────────────

export async function getDaemonStatus(): Promise<DaemonLifecycleStatus> {
	try {
		const client = getDaemonClient();
		const health = await client.checkHealth();
		return health.ok ? 'running' : 'stopped';
	} catch {
		return 'stopped';
	}
}

// ─── Restart ─────────────────────────────────────────────────────────────────

export async function restartDaemon(): Promise<void> {
	// Best-effort stop — ignore if already stopped
	try {
		await stopDaemon();
		// Give the process a moment to exit before we try to rebind the port
		await new Promise<void>((r) => setTimeout(r, 1500));
	} catch {
		// Already stopped — proceed to start
	}
	await startDaemon();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const daemonLifecycle = {
	startDaemon,
	stopDaemon,
	restartDaemon,
	getDaemonStatus,
};
