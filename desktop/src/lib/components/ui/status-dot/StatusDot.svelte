<script lang="ts">
	type Status = 'connected' | 'disconnected' | 'warning' | 'error' | 'idle';
	type Props = {
		status?: Status;
		pulse?: boolean;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	};
	let { status = 'idle', pulse = false, size = 'md', class: className = '' }: Props = $props();

	const colors: Record<Status, string> = {
		connected: 'var(--color-success)',
		disconnected: 'var(--color-text-disabled)',
		warning: 'var(--color-warning)',
		error: 'var(--color-error)',
		idle: 'var(--color-text-muted)',
	};

	const sizes: Record<string, string> = { sm: '6px', md: '8px', lg: '10px' };
</script>

<span
	class="status-dot {className}"
	class:pulse
	style="--dot-color: {colors[status]}; --dot-size: {sizes[size]}"
	aria-label={status}
	title={status}
></span>

<style>
	.status-dot {
		display: inline-block;
		width: var(--dot-size);
		height: var(--dot-size);
		border-radius: var(--radius-full);
		background: var(--dot-color);
		flex-shrink: 0;
	}

	.status-dot.pulse {
		animation: statusPulse 2s ease-in-out infinite;
	}

	@keyframes statusPulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.6; transform: scale(0.85); }
	}

	@media (prefers-reduced-motion: reduce) {
		.status-dot.pulse { animation: none; }
	}
</style>
