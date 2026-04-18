<script lang="ts">
	import { connectionStore } from '$lib/stores/connection.svelte.js';
	import StatusDot from '$lib/components/ui/status-dot/StatusDot.svelte';

	const statusMap: Record<string, { label: string; dotStatus: 'connected' | 'disconnected' | 'warning' }> = {
		connected: { label: 'Connected', dotStatus: 'connected' },
		disconnected: { label: 'Disconnected', dotStatus: 'disconnected' },
		reconnecting: { label: 'Reconnecting', dotStatus: 'warning' },
	};

	const info = $derived(statusMap[connectionStore.status]);
</script>

<div class="connection-status" role="status" aria-live="polite" aria-label={`Daemon status: ${info.label}`}>
	<StatusDot
		status={info.dotStatus}
		pulse={connectionStore.status === 'reconnecting'}
		size="sm"
	/>
	<span class="status-text mono-label">{info.label}</span>
</div>

<style>
	.connection-status {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-muted);
	}

	.status-text {
		transition: color var(--transition-base);
	}
</style>
