import { getDaemonClient } from '$lib/daemon/client.js';
import type { ConnectionStatus } from '$lib/daemon/types.js';

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const MAX_RECONNECT_ATTEMPTS = 3;

let status = $state<ConnectionStatus>('disconnected');
let lastHealthCheck = $state<Date | null>(null);
let lastError = $state<string | null>(null);

let pollTimer: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;

async function checkConnection(): Promise<void> {
	try {
		const client = getDaemonClient();
		await client.checkHealth();

		status = 'connected';
		lastHealthCheck = new Date();
		lastError = null;
		reconnectAttempts = 0;
	} catch (error) {
		lastError = error instanceof Error ? error.message : 'Connection failed';

		if (status === 'connected') {
			status = 'reconnecting';
		}

		reconnectAttempts++;

		if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			status = 'disconnected';
			reconnectAttempts = 0;
		}
	}
}

export function startPolling(): void {
	if (pollTimer) return;

	// Check immediately
	void checkConnection();

	pollTimer = setInterval(() => {
		void checkConnection();
	}, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
}

export const connectionStore = {
	get status() { return status; },
	get isConnected() { return status === 'connected'; },
	get lastHealthCheck() { return lastHealthCheck; },
	get lastError() { return lastError; },
	start: startPolling,
	stop: stopPolling,
	checkNow: checkConnection,
};
