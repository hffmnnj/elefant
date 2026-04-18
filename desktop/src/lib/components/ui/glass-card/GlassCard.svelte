<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = {
		hoverable?: boolean;
		class?: string;
		children?: Snippet;
		onclick?: () => void;
	};
	let { hoverable = false, class: className = '', children, onclick }: Props = $props();
</script>

{#if onclick}
	<button
		class="glass-card glass-md {className}"
		class:hoverable
		{onclick}
		type="button"
	>
		{@render children?.()}
	</button>
{:else}
	<div class="glass-card glass-md {className}" class:hoverable>
		{@render children?.()}
	</div>
{/if}

<style>
	.glass-card {
		border-radius: var(--radius-xl);
		padding: var(--space-5);
		width: 100%;
		text-align: left;
	}

	button.glass-card {
		cursor: pointer;
		font: inherit;
		color: inherit;
	}

	.glass-card.hoverable {
		cursor: pointer;
		transition:
			transform var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.glass-card.hoverable:hover {
		transform: translateY(-1px);
		box-shadow: var(--glow-primary);
	}

	.glass-card.hoverable:active {
		transform: scale(0.99);
	}

	.glass-card:focus-visible {
		outline: none;
		box-shadow: var(--glow-focus);
	}
</style>
