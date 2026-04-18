<script lang="ts">
	type Props = {
		value: number;
		label?: string;
		showLabel?: boolean;
		class?: string;
	};
	let { value, label, showLabel = false, class: className = '' }: Props = $props();

	const clampedValue = $derived(Math.min(100, Math.max(0, value)));
</script>

<div class="progress-wrapper {className}">
	{#if label || showLabel}
		<div class="progress-header">
			{#if label}<span class="mono-label">{label}</span>{/if}
			{#if showLabel}<span class="mono-label">{clampedValue}%</span>{/if}
		</div>
	{/if}
	<div
		class="progress-bar"
		role="progressbar"
		aria-valuenow={clampedValue}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={label ?? 'Progress'}
	>
		<div
			class="progress-fill"
			style="width: {clampedValue}%"
		></div>
	</div>
</div>

<style>
	.progress-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: var(--color-surface-elevated);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary);
		border-radius: var(--radius-full);
		transition: width var(--transition-base);
		min-width: 4px;
	}
</style>
