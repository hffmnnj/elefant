<script lang="ts">
	import { configService } from '$lib/services/config-service.js';
	import type { ProviderEntry } from '$lib/daemon/types.js';
	import ProviderCard from './ProviderCard.svelte';
	import { onMount } from 'svelte';

	let providers = $state<ProviderEntry[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const config = await configService.readConfig();
		providers = config?.providers ?? [];
		loading = false;
	});
</script>

<div class="models-view">
	<div class="models-header">
		<h2 class="models-title">Models</h2>
		<p class="models-subtitle">Configured AI providers and their models.</p>
	</div>

	{#if loading}
		<div class="loading-state" role="status" aria-live="polite">
			<p>Loading providers...</p>
		</div>
	{:else if providers.length === 0}
		<div class="empty-state">
			<div class="empty-icon" aria-hidden="true">🤖</div>
			<h3 class="empty-title">No providers configured</h3>
			<p class="empty-desc">
				Add providers in Settings → Providers to see them here.
			</p>
			<p class="empty-hint">Elefant supports OpenAI-compatible and Anthropic APIs.</p>
		</div>
	{:else}
		<ul class="provider-grid" role="list">
			{#each providers as provider}
				<ProviderCard {provider} />
			{/each}
		</ul>
	{/if}
</div>

<style>
	.models-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: var(--color-bg);
	}

	.models-header {
		padding: var(--space-5) var(--space-6);
		border-bottom: 1px solid var(--color-border);
		background-color: var(--color-surface);
		flex-shrink: 0;
	}

	.models-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		letter-spacing: var(--tracking-snug);
	}

	.models-subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	.loading-state {
		padding: var(--space-8) var(--space-6);
		color: var(--color-text-muted);
		font-size: var(--font-size-md);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-10) var(--space-6);
		text-align: center;
		gap: var(--space-3);
	}

	.empty-icon {
		font-size: 40px;
		opacity: 0.6;
	}

	.empty-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.empty-desc {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
	}

	.empty-hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.provider-grid {
		list-style: none;
		padding: var(--space-5) var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		overflow-y: auto;
	}
</style>
