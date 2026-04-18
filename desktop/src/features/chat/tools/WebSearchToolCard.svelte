<script lang="ts">
	import type { ToolCardProps } from './types.js';
	import ToolCardShell from './ToolCardShell.svelte';

	let { toolCall }: ToolCardProps = $props();

	const status = $derived<'running' | 'success' | 'error'>(
		!toolCall.result ? 'running' : toolCall.result.isError ? 'error' : 'success'
	);

	const errorMessage = $derived(
		toolCall.result?.isError ? toolCall.result.content : undefined
	);

	const query = $derived(
		typeof toolCall.arguments.query === 'string' ? toolCall.arguments.query : ''
	);

	const truncatedQuery = $derived(
		query.length > 60 ? query.slice(0, 57) + '…' : query
	);

	type SearchResult = {
		title: string;
		url: string;
		description: string;
	};

	function parseSearchResults(content: string): SearchResult[] {
		if (!content || content.startsWith('Web search is disabled') || content === 'No results found.') {
			return [];
		}
		return content.split('\n---\n').map(block => {
			const lines = block.trim().split('\n');
			const title = lines.find(l => l.startsWith('Title: '))?.slice(7) ?? '';
			const url = lines.find(l => l.startsWith('URL: '))?.slice(5) ?? '';
			const description = lines
				.filter(l => !l.startsWith('Title: ') && !l.startsWith('URL: '))
				.join(' ')
				.trim();
			return { title, url, description };
		}).filter(r => r.title || r.url);
	}

	const results = $derived(
		toolCall.result?.content && !toolCall.result.isError
			? parseSearchResults(toolCall.result.content)
			: []
	);

	const resultCount = $derived(results.length);

	let showAll = $state(false);

	const visibleResults = $derived(
		showAll || results.length <= 10 ? results : results.slice(0, 10)
	);

	const hiddenCount = $derived(results.length - visibleResults.length);
</script>

<ToolCardShell
	toolName="websearch"
	{status}
	{errorMessage}
	subtitle={truncatedQuery || undefined}
>
	{#snippet children()}
		{#if status !== 'running'}
			<div class="search-body">
				{#if resultCount === 0}
					<span class="search-empty">No results</span>
				{:else}
					<div class="search-header-info">
						<span class="search-badge">{resultCount} result{resultCount === 1 ? '' : 's'}</span>
					</div>
					<div class="search-result-list">
						{#each visibleResults as result, i}
							{#if i > 0}
								<div class="search-divider" aria-hidden="true"></div>
							{/if}
							<div class="search-result">
								<div class="search-result-title">{result.title}</div>
								{#if result.url}
									<div class="search-result-url">{result.url}</div>
								{/if}
								{#if result.description}
									<div class="search-result-description">{result.description}</div>
								{/if}
							</div>
						{/each}
						{#if hiddenCount > 0}
							<button
								class="search-show-more"
								onclick={() => showAll = true}
							>
								Show {hiddenCount} more
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	{/snippet}
</ToolCardShell>

<style>
	.search-body {
		padding: var(--space-3);
	}

	.search-empty {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-style: italic;
	}

	.search-header-info {
		margin-bottom: var(--space-2);
	}

	.search-badge {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-primary);
	}

	.search-result-list {
		display: flex;
		flex-direction: column;
	}

	.search-divider {
		border-top: 1px solid var(--color-border);
		margin: var(--space-2) 0;
	}

	.search-result {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.search-result-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.search-result-url {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.search-result-description {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.search-show-more {
		background: none;
		border: none;
		padding: var(--space-1) 0;
		margin-top: var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--color-primary);
		cursor: pointer;
		text-align: left;
		font-family: var(--font-sans);
	}

	.search-show-more:hover {
		text-decoration: underline;
	}
</style>
