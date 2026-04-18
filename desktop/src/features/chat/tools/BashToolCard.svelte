<script lang="ts">
	import type { ToolCardProps } from './types.js';
	import ToolCardShell from './ToolCardShell.svelte';

	let { toolCall }: ToolCardProps = $props();

	const command = $derived((toolCall.arguments.command as string) ?? '');

	const truncatedCommand = $derived(
		command.length > 60 ? command.slice(0, 60) + '…' : command
	);

	const exitCodeMatch = $derived(
		toolCall.result?.content
			? toolCall.result.content.match(/\[Exit code: (\d+)\]\s*$/)
			: null
	);

	const exitCode = $derived(
		exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0
	);

	const output = $derived(() => {
		if (!toolCall.result?.content) return '';
		const content = toolCall.result.content;
		if (exitCodeMatch) {
			return content.slice(0, content.lastIndexOf('[Exit code:'))?.trimEnd() ?? '';
		}
		return content;
	});

	const hasOutput = $derived(output().trim().length > 0);

	const status = $derived((): 'running' | 'success' | 'error' => {
		if (!toolCall.result) return 'running';
		if (toolCall.result.isError || exitCode !== 0) return 'error';
		return 'success';
	});

	const errorMessage = $derived(
		exitCode !== 0 ? `Exit code ${exitCode}` : toolCall.result?.isError ? toolCall.result.content : undefined
	);
</script>

<ToolCardShell
	toolName="bash"
	status={status()}
	{errorMessage}
	subtitle={truncatedCommand}
>
	{#snippet children()}
		{#if toolCall.result}
			<div class="bash-body">
				{#if exitCode !== 0 && toolCall.result}
					<span class="bash-exit-badge exit-error">exit {exitCode}</span>
				{/if}
				{#if hasOutput}
					<pre class="bash-output">{output()}</pre>
				{:else}
					<span class="bash-no-output">(no output)</span>
				{/if}
			</div>
		{/if}
	{/snippet}
</ToolCardShell>

<style>
	.bash-body {
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.bash-exit-badge {
		display: inline-flex;
		align-self: flex-start;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
	}

	.exit-error {
		color: var(--color-error);
		background-color: color-mix(in oklch, var(--color-error) 10%, transparent);
	}

	.bash-output {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		background-color: var(--color-bg);
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		max-height: 240px;
		overflow-y: auto;
		white-space: pre-wrap;
		word-break: break-all;
		margin: 0;
	}

	.bash-no-output {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-style: italic;
	}
</style>
