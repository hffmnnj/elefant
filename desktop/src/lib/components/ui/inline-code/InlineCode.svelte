<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = {
		class?: string;
		children?: Snippet;
	};
	let { class: className = '', children }: Props = $props();
</script>

<code class="inline-code {className}">{@render children?.()}</code>

<style>
	.inline-code {
		font-family: var(--font-mono);
		font-size: 0.875em;
		color: var(--color-primary);
		background: var(--color-primary-subtle);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: 0 var(--space-2);
		white-space: nowrap;
	}
</style>
