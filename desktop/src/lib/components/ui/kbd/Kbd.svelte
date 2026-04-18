<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = {
		class?: string;
		children?: Snippet;
	};
	let { class: className = '', children }: Props = $props();
</script>

<kbd class="kbd {className}">{@render children?.()}</kbd>

<style>
	.kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-strong);
		border-bottom-width: 2px;
		border-radius: var(--radius-sm);
		padding: 1px var(--space-2);
		min-width: 20px;
		line-height: 1.6;
		white-space: nowrap;
	}
</style>
