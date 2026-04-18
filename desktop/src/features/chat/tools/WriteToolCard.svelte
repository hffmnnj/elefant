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

	const bytesWritten = $derived(() => {
		if (!toolCall.result?.content || toolCall.result.isError) return null;
		const match = toolCall.result.content.match(/(\d+)\s+bytes?/i);
		return match ? match[1] : null;
	});

	const subtitle = $derived(filePath ?? undefined);
</script>

<ToolCardShell
	toolName="write"
	{status}
	{errorMessage}
	{subtitle}
>
	{#if status === 'success'}
		<div class="write-body">
			{#if bytesWritten() !== null}
				<span class="bytes-badge">{bytesWritten()} bytes written</span>
			{:else}
				<pre class="write-raw">{toolCall.result?.content}</pre>
			{/if}
		</div>
	{/if}
</ToolCardShell>

<style>
	.write-body {
		padding: var(--space-2) var(--space-3);
	}

	.bytes-badge {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-primary);
		background-color: var(--color-primary-subtle);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		line-height: 1;
	}

	.write-raw {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		margin: 0;
		white-space: pre-wrap;
		word-break: break-all;
	}
</style>
