<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = {
		onremove?: () => void;
		class?: string;
		children?: Snippet;
	};
	let { onremove, class: className = '', children }: Props = $props();
</script>

<span class="chip {className}">
	{@render children?.()}
	{#if onremove}
		<button class="chip-remove" onclick={onremove} aria-label="Remove" type="button">
			<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
		</button>
	{/if}
</span>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-full);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.chip-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: var(--radius-full);
		padding: 0;
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.chip-remove:hover {
		color: var(--color-text-primary);
		background: var(--color-surface-hover);
	}

	.chip-remove:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
</style>
