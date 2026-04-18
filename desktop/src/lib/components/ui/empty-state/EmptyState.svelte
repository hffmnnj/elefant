<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = {
		title: string;
		description?: string;
		action?: Snippet;
		class?: string;
	};
	let { title, description, action, class: className = '' }: Props = $props();
</script>

<div class="empty-state {className}">
	<div class="empty-icon">
		<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
	</div>
	<p class="empty-title">{title}</p>
	{#if description}
		<p class="empty-description">{description}</p>
	{/if}
	{#if action}
		<div class="empty-action">
			{@render action()}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-10) var(--space-7);
		text-align: center;
	}

	.empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: var(--radius-xl);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.empty-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin: 0;
	}

	.empty-description {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
		max-width: 280px;
		line-height: var(--leading-relaxed);
	}

	.empty-action {
		margin-top: var(--space-2);
	}
</style>
