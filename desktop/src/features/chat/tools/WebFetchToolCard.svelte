<script lang="ts">
	import type { ToolCardProps } from './types.js';
	import ToolCardShell from './ToolCardShell.svelte';

	// webfetch returns plain text/markdown, no title field — URL is the primary identifier

	let { toolCall }: ToolCardProps = $props();

	const status = $derived<'running' | 'success' | 'error'>(
		!toolCall.result ? 'running' : toolCall.result.isError ? 'error' : 'success'
	);

	const errorMessage = $derived(
		toolCall.result?.isError ? toolCall.result.content : undefined
	);

	const url = $derived(
		typeof toolCall.arguments.url === 'string' ? toolCall.arguments.url : ''
	);

	const truncatedUrl = $derived(
		url.length > 60 ? url.slice(0, 57) + '…' : url
	);

	const content = $derived(
		toolCall.result?.content && !toolCall.result.isError
			? toolCall.result.content
			: ''
	);

	const wordCount = $derived(
		content
			? content.split(/\s+/).filter(Boolean).length
			: 0
	);

	const previewLines = $derived(() => {
		if (!content) return [];
		return content
			.split('\n')
			.filter((line: string) => line.trim() !== '')
			.slice(0, 3);
	});
</script>

<ToolCardShell
	toolName="webfetch"
	{status}
	{errorMessage}
	subtitle={truncatedUrl || undefined}
>
	{#snippet children()}
		{#if status === 'success'}
			<div class="fetch-body">
				<div class="fetch-url">{url}</div>
				{#if !content || content.length < 10}
					<p class="no-content">No content retrieved</p>
				{:else}
					{#if previewLines().length > 0}
						<div class="fetch-preview">
							{#each previewLines() as line}
								<div class="fetch-preview-line">{line}</div>
							{/each}
						</div>
					{/if}
					<div class="fetch-caption">
						{wordCount.toLocaleString()} word{wordCount === 1 ? '' : 's'} fetched
					</div>
				{/if}
			</div>
		{/if}
	{/snippet}
</ToolCardShell>

<style>
	.fetch-body {
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.fetch-url {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.fetch-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.fetch-preview-line {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		line-height: 1.4;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.no-content {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-style: italic;
		margin: 0;
	}

	.fetch-caption {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}
</style>
