<script lang="ts">
	import type { Snippet } from 'svelte';
	type Variant = 'default' | 'primary' | 'success' | 'warning' | 'error';
	type Props = {
		variant?: Variant;
		class?: string;
		children?: Snippet;
	};
	let { variant = 'default', class: className = '', children }: Props = $props();
</script>

<span class="tag tag-{variant} industrial-caps {className}">
	{@render children?.()}
</span>

<style>
	.tag {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 1px var(--space-2);
		border-radius: var(--radius-xs);
		border: 1px solid;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		white-space: nowrap;
		line-height: 1.5;
	}

	.tag-default {
		color: var(--color-text-secondary);
		background: var(--color-surface-elevated);
		border-color: var(--color-border);
	}

	.tag-primary {
		color: var(--color-primary);
		background: var(--color-primary-subtle);
		border-color: var(--color-primary-muted);
	}

	.tag-success {
		color: var(--color-success);
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.3);
	}

	.tag-warning {
		color: var(--color-warning);
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.3);
	}

	.tag-error {
		color: var(--color-error);
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.3);
	}
</style>
