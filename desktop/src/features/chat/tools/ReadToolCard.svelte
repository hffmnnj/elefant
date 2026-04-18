<script lang="ts">
	import type { ToolCardProps } from './types.js';
	import ToolCardShell from './ToolCardShell.svelte';

	let { toolCall }: ToolCardProps = $props();

	const filePath = $derived(
		typeof toolCall.arguments.filePath === 'string'
			? toolCall.arguments.filePath
			: typeof toolCall.arguments.path === 'string'
				? toolCall.arguments.path
				: null
	);

	const status = $derived<'running' | 'success' | 'error'>(
		!toolCall.result ? 'running' : toolCall.result.isError ? 'error' : 'success'
	);

	const errorMessage = $derived(
		toolCall.result?.isError ? toolCall.result.content : undefined
	);

	const lines = $derived(() => {
		if (!toolCall.result?.content || toolCall.result.isError) return [];
		return toolCall.result.content.split('\n');
	});

	const previewLines = $derived(lines().slice(0, 20));
	const remainingCount = $derived(Math.max(0, lines().length - 20));

	const subtitle = $derived(filePath ?? undefined);
</script>

<ToolCardShell
	toolName="read"
	{status}
	{errorMessage}
	{subtitle}
>
	{#if status === 'success' && previewLines.length > 0}
		<div class="read-body">
			<pre class="read-content">{previewLines.join('\n')}</pre>
			{#if remainingCount > 0}
				<div class="read-footer">
					… {remainingCount} more line{remainingCount === 1 ? '' : 's'}
				</div>
			{/if}
		</div>
	{/if}
</ToolCardShell>

<style>
	.read-body {
		display: flex;
		flex-direction: column;
	}

	.read-content {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		line-height: 1.4;
		color: var(--color-text-secondary);
		background-color: var(--color-bg);
		padding: var(--space-3);
		margin: 0;
		max-height: 300px;
		overflow-y: auto;
		overflow-x: auto;
		white-space: pre;
		word-break: break-all;
	}

	.read-footer {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-border);
	}
</style>
