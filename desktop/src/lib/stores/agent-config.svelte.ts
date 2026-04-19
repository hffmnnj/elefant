// Agent config store (Svelte 5 runes).
//
// Single source of truth for the profile list + the currently-open
// resolved profile detail. Calls the daemon's `/api/config/agents`
// endpoints (landed in Wave 4 backend). Until that backend ships, the
// store surfaces a friendly `lastError` rather than crashing the view.

import { DAEMON_URL } from '$lib/daemon/client.js';
import type {
	AgentProfile,
	ResolvedAgentConfig,
	DaemonResult,
} from '$lib/types/agent-config.js';

let profiles = $state<AgentProfile[]>([]);
let resolvedByAgentId = $state<Record<string, ResolvedAgentConfig>>({});
let isLoading = $state(false);
let lastError = $state<string | null>(null);

function clearError(): void {
	lastError = null;
}

function setError(message: string): void {
	lastError = message;
	console.error('[agent-config]', message);
}

async function readResult<T>(response: Response, label: string): Promise<T> {
	if (!response.ok) {
		// Try to surface the daemon's structured error if there is one.
		const text = await response.text().catch(() => '');
		try {
			const parsed = JSON.parse(text) as DaemonResult<T>;
			if (!parsed.ok) throw new Error(parsed.error || `${label}: HTTP ${response.status}`);
		} catch {
			// fall through to the generic message
		}
		throw new Error(`${label}: HTTP ${response.status}`);
	}
	const parsed = (await response.json()) as DaemonResult<T>;
	if (!parsed.ok) throw new Error(parsed.error || `${label}: daemon returned ok=false`);
	return parsed.data;
}

async function refresh(): Promise<void> {
	isLoading = true;
	clearError();
	try {
		const response = await fetch(`${DAEMON_URL}/api/config/agents`, {
			headers: { Accept: 'application/json' },
		});
		profiles = await readResult<AgentProfile[]>(response, 'GET /api/config/agents');
	} catch (err) {
		setError(err instanceof Error ? err.message : 'Failed to load agent profiles');
	} finally {
		isLoading = false;
	}
}

async function loadResolved(agentId: string): Promise<ResolvedAgentConfig | null> {
	clearError();
	try {
		const response = await fetch(
			`${DAEMON_URL}/api/config/agents/${encodeURIComponent(agentId)}`,
			{ headers: { Accept: 'application/json' } },
		);
		const data = await readResult<ResolvedAgentConfig>(
			response,
			`GET /api/config/agents/${agentId}`,
		);
		resolvedByAgentId = { ...resolvedByAgentId, [agentId]: data };
		return data;
	} catch (err) {
		setError(err instanceof Error ? err.message : 'Failed to load agent config');
		return null;
	}
}

async function create(profile: AgentProfile): Promise<AgentProfile | null> {
	clearError();
	try {
		const response = await fetch(`${DAEMON_URL}/api/config/agents`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(profile),
		});
		const created = await readResult<AgentProfile>(response, 'POST /api/config/agents');
		profiles = [...profiles, created];
		return created;
	} catch (err) {
		setError(err instanceof Error ? err.message : 'Failed to create profile');
		return null;
	}
}

async function update(
	agentId: string,
	patch: Partial<AgentProfile>,
): Promise<AgentProfile | null> {
	clearError();
	try {
		const response = await fetch(
			`${DAEMON_URL}/api/config/agents/${encodeURIComponent(agentId)}`,
			{
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(patch),
			},
		);
		const updated = await readResult<AgentProfile>(
			response,
			`PUT /api/config/agents/${agentId}`,
		);
		profiles = profiles.map((p) => (p.id === agentId ? updated : p));
		// Invalidate the cached resolved view; the next read will refetch.
		const { [agentId]: _dropped, ...rest } = resolvedByAgentId;
		resolvedByAgentId = rest;
		return updated;
	} catch (err) {
		setError(err instanceof Error ? err.message : 'Failed to update profile');
		return null;
	}
}

async function remove(agentId: string): Promise<boolean> {
	clearError();
	try {
		const response = await fetch(
			`${DAEMON_URL}/api/config/agents/${encodeURIComponent(agentId)}`,
			{ method: 'DELETE' },
		);
		await readResult<{ deleted: true }>(response, `DELETE /api/config/agents/${agentId}`);
		profiles = profiles.filter((p) => p.id !== agentId);
		const { [agentId]: _dropped, ...rest } = resolvedByAgentId;
		resolvedByAgentId = rest;
		return true;
	} catch (err) {
		setError(err instanceof Error ? err.message : 'Failed to delete profile');
		return false;
	}
}

// Test-only helper: seed state without going through fetch.
export function _seedAgentConfigStore(
	seedProfiles: AgentProfile[],
	seedResolved: Record<string, ResolvedAgentConfig> = {},
): void {
	profiles = seedProfiles;
	resolvedByAgentId = seedResolved;
	lastError = null;
	isLoading = false;
}

// Test-only helper: full reset.
export function resetAgentConfigStore(): void {
	profiles = [];
	resolvedByAgentId = {};
	lastError = null;
	isLoading = false;
}

export const agentConfigStore = {
	get profiles() {
		return profiles;
	},
	get resolvedByAgentId() {
		return resolvedByAgentId;
	},
	get isLoading() {
		return isLoading;
	},
	get lastError() {
		return lastError;
	},
	refresh,
	loadResolved,
	create,
	update,
	remove,
};
