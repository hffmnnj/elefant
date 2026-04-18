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

	interface GrepMatch {
		filePath: string;
		lineNumber: string;
		content: string;
	}

	interface FileGroup {
		filePath: string;
		matches: GrepMatch[];
	}

	const allMatches = $derived((): GrepMatch[] => {
		if (!toolCall.result?.content) return [];
		const lines = toolCall.result.content.split('\n').filter((l: string) => l.trim() !== '');
		const parsed: GrepMatch[] = [];
		for (const line of lines) {
			const match = line.match(/^(.*?):(\d+): (.*)$/);
			if (match) {
				parsed.push({
					filePath: match[1],
					lineNumber: match[2],
					content: match[3],
				});
			}
		}
		return parsed;
	});

	const fileGroups = $derived((): FileGroup[] => {
		const matches = allMatches();
		const groupMap = new Map<string, GrepMatch[]>();
		for (const m of matches) {
			const existing = groupMap.get(m.filePath);
			if (existing) {
				existing.push(m);
			} else {
				groupMap.set(m.filePath, [m]);
			}
		}
		const groups: FileGroup[] = [];
		for (const [filePath, matches] of groupMap) {
			groups.push({ filePath, matches });
		}
		return groups;
	});

	const totalMatchCount = $derived(allMatches().length);

	const MAX_TOTAL_DISPLAY = 50;
	const MAX_PER_FILE = 5;

	let expandedFiles = $state(new Set<string>());

	function toggleFile(filePath: string) {
		const next = new Set(expandedFiles);
		if (next.has(filePath)) {
			next.delete(filePath);
		} else {
			next.add(filePath);
		}
		expandedFiles = next;
	}

	const displayGroups = $derived((): FileGroup[] => {
		const groups = fileGroups();
		if (totalMatchCount <= MAX_TOTAL_DISPLAY) return groups;
		let count = 0;
		const result: FileGroup[] = [];
		for (const group of groups) {
			if (count >= MAX_TOTAL_DISPLAY) break;
			const remaining = MAX_TOTAL_DISPLAY - count;
			if (group.matches.length <= remaining) {
				result.push(group);
				count += group.matches.length;
			} else {
				result.push({ filePath: group.filePath, matches: group.matches.slice(0, remaining) });
				count += remaining;
			}
		}
		return result;
	});

	const isTruncated = $derived(totalMatchCount > MAX_TOTAL_DISPLAY);
</script>

<ToolCardShell
	toolName="grep"
	{status}
	errorMessage={toolCall.result?.isError ? toolCall.result.content : undefined}
	subtitle={pattern}
>
	{#snippet children()}
		<div class="grep-body">
			{#if status !== 'running'}
				{#if totalMatchCount === 0}
					<span class="grep-empty">No matches</span>
				{:else}
					<div class="grep-header-info">
						<span class="grep-badge">
							{totalMatchCount} {totalMatchCount === 1 ? 'match' : 'matches'}
						</span>
						{#if isTruncated}
							<span class="grep-truncated">
								(showing {MAX_TOTAL_DISPLAY} of {totalMatchCount})
							</span>
						{/if}
					</div>
					<div class="grep-groups">
						{#each displayGroups() as group}
							{@const isExpanded = expandedFiles.has(group.filePath)}
							{@const visibleMatches = isExpanded ? group.matches : group.matches.slice(0, MAX_PER_FILE)}
							{@const hasMore = group.matches.length > MAX_PER_FILE}
							<div class="grep-file-group">
								<div class="grep-file-header">{group.filePath}</div>
								<div class="grep-matches">
									{#each visibleMatches as m}
										<div class="grep-match-line">
											<span class="grep-line-num">{m.lineNumber}:</span>
											<span class="grep-match-content">{m.content}</span>
										</div>
									{/each}
									{#if hasMore && !isExpanded}
										<button
											class="grep-show-more"
											onclick={() => toggleFile(group.filePath)}
										>
											{group.matches.length - MAX_PER_FILE} more
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/snippet}
</ToolCardShell>

<style>
	.grep-body {
		padding: var(--space-3);
	}

	.grep-empty {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-style: italic;
	}

	.grep-header-info {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.grep-badge {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-primary);
	}

	.grep-truncated {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.grep-groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.grep-file-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.grep-file-header {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
	}

	.grep-matches {
		display: flex;
		flex-direction: column;
		gap: 0;
		padding-left: var(--space-2);
	}

	.grep-match-line {
		display: flex;
		gap: var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		line-height: 1.5;
		min-width: 0;
	}

	.grep-line-num {
		color: var(--color-text-muted);
		flex-shrink: 0;
		user-select: none;
	}

	.grep-match-content {
		color: var(--color-text-secondary);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.grep-show-more {
		background: none;
		border: none;
		padding: var(--space-1) 0;
		font-size: var(--font-size-xs);
		color: var(--color-primary);
		cursor: pointer;
		text-align: left;
		font-family: var(--font-sans);
	}

	.grep-show-more:hover {
		text-decoration: underline;
	}
</style>
