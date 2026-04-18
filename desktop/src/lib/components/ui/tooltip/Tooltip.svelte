<script lang="ts">
	import type { Snippet } from 'svelte';
	type Position = 'top' | 'bottom' | 'left' | 'right';
	type Props = {
		content: string;
		position?: Position;
		class?: string;
		children?: Snippet;
	};
	let { content, position = 'top', class: className = '', children }: Props = $props();

	let visible = $state(false);
</script>

<span
	class="tooltip-wrapper {className}"
	role="group"
	onmouseenter={() => (visible = true)}
	onmouseleave={() => (visible = false)}
	onfocus={() => (visible = true)}
	onblur={() => (visible = false)}
>
	{@render children?.()}
	{#if visible}
		<div class="tooltip tooltip-{position}" role="tooltip">
			{content}
		</div>
	{/if}
</span>

<style>
	.tooltip-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.tooltip {
		position: absolute;
		z-index: var(--z-tooltip);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-family: var(--font-sans);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		background: var(--glass-bg-strong, var(--color-surface-elevated));
		backdrop-filter: blur(var(--blur-sm));
		border: 1px solid var(--glass-border-strong, var(--color-border-strong));
		white-space: nowrap;
		pointer-events: none;
		animation: tooltipFadeIn var(--transition-fast);
		box-shadow: var(--shadow-md);
	}

	.tooltip-top { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
	.tooltip-bottom { top: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
	.tooltip-left { right: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
	.tooltip-right { left: calc(100% + 8px); top: 50%; transform: translateY(-50%); }

	@keyframes tooltipFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		.tooltip { animation: none; }
	}
</style>
