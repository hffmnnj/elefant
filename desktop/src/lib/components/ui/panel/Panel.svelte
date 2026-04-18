<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = {
		title?: string;
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children?: Snippet;
	};
	let { title, padding = 'md', class: className = '', children }: Props = $props();

	const paddingValues = { none: '0', sm: 'var(--space-3)', md: 'var(--space-5)', lg: 'var(--space-7)' };
</script>

<div class="panel glass-sm {className}" style="--panel-padding: {paddingValues[padding]}">
	{#if title}
		<div class="panel-header">
			<span class="industrial-caps">{title}</span>
		</div>
	{/if}
	<div class="panel-body">
		{@render children?.()}
	</div>
</div>

<style>
	.panel {
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.panel-header {
		padding: var(--space-3) var(--panel-padding);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
	}

	.panel-body {
		padding: var(--panel-padding);
	}
</style>
