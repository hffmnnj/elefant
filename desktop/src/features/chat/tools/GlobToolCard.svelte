<script lang="ts">
	import type { ToolCardProps } from './types.js';
	import ToolCardShell from './ToolCardShell.svelte';

	let { toolCall }: ToolCardProps = $props();

	const status = $derived(
		toolCall.result
			? toolCall.result.isError ? 'error' : 'success'
			: 'running'
	);

	const pattern = $derived((toolCall.arguments.pattern as string) ?? '');

	const files = $derived(
		toolCall.result?.content
			? toolCall.result.content.split('\n').filter((line: string) => line.trim() !== '')
			: []
	);

	const matchCount = $derived(files.length);

	let showAll = $state(false);

	const visibleFiles = $derived(
		showAll || files.length <= 10 ? files : files.slice(0, 10)
	);

	const hiddenCount = $derived(files.length - visibleFiles.length);
</script>

<ToolCardShell
	toolName="glob"
	{status}
	errorMessage={toolCall.result?.isError ? toolCall.result.content : undefined}
	subtitle={pattern}
>
	{#snippet children()}
		<div class="glob-body">
			{#if status !== 'running'}
				{#if matchCount === 0}
					<span class="glob-empty">No matches</span>
				{:else}
					<div class="glob-header-info">
						<span class="glob-badge">{matchCount} {matchCount === 1 ? 'file' : 'files'}</span>
					</div>
					<div class="glob-file-list">
						{#each visibleFiles as filePath}
							<div class="glob-file-path">{filePath}</div>
						{/each}
						{#if hiddenCount > 0}
							<button
								class="glob-show-more"
								onclick={() => showAll = true}
							>
								Show {hiddenCount} more
							</button>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	{/snippet}
</ToolCardShell>

<style>
	.glob-body {
		padding: var(--space-3);
	}

	.glob-empty {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-style: italic;
	}

	.glob-header-info {
		margin-bottom: var(--space-2);
	}

	.glob-badge {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-primary);
	}

	.glob-file-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.glob-file-path {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		padding-left: var(--space-2);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.glob-show-more {
		background: none;
		border: none;
		padding: var(--space-1) var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--color-primary);
		cursor: pointer;
		text-align: left;
		font-family: var(--font-sans);
	}

	.glob-show-more:hover {
		text-decoration: underline;
	}
</style>
