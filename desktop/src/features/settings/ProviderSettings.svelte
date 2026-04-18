<script lang="ts">
	import { configService } from '$lib/services/config-service.js';
	import type { ProviderEntry } from '$lib/daemon/types.js';
	import ProviderForm from './ProviderForm.svelte';
	import { onMount } from 'svelte';

	let providers = $state<ProviderEntry[]>([]);
	let showForm = $state(false);
	let editingProvider = $state<ProviderEntry | undefined>(undefined);
	let status = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	onMount(async () => {
		await loadProviders();
	});

	async function loadProviders(): Promise<void> {
		const config = await configService.readConfig();
		providers = config?.providers ?? [];
	}

	async function handleSave(provider: ProviderEntry): Promise<void> {
		try {
			if (editingProvider) {
				await configService.updateProvider(editingProvider.name, provider);
				status = { type: 'success', message: 'Provider updated' };
			} else {
				await configService.addProvider(provider);
				status = { type: 'success', message: 'Provider added' };
			}
			await loadProviders();
			showForm = false;
			editingProvider = undefined;
		} catch (error) {
			status = {
				type: 'error',
				message: error instanceof Error ? error.message : 'Failed to save provider',
			};
		}
		setTimeout(() => {
			status = null;
		}, 3000);
	}

	async function handleDelete(name: string): Promise<void> {
		try {
			await configService.deleteProvider(name);
			await loadProviders();
			status = { type: 'success', message: `Provider "${name}" deleted` };
		} catch (error) {
			status = {
				type: 'error',
				message: error instanceof Error ? error.message : 'Failed to delete provider',
			};
		}
		setTimeout(() => {
			status = null;
		}, 3000);
	}

	function handleEdit(provider: ProviderEntry): void {
		editingProvider = provider;
		showForm = true;
	}

	function handleCancelForm(): void {
		showForm = false;
		editingProvider = undefined;
	}
</script>

<div class="provider-settings">
	<div class="section-header">
		<h3 class="section-heading">Providers</h3>
		<button
			class="btn-add"
			onclick={() => {
				editingProvider = undefined;
				showForm = !showForm;
			}}
		>
			{showForm && !editingProvider ? 'Cancel' : '+ Add Provider'}
		</button>
	</div>

	{#if status}
		<div class="status-message" class:error={status.type === 'error'} role="status">
			{status.message}
		</div>
	{/if}

	{#if showForm}
		<ProviderForm
			provider={editingProvider}
			onSave={handleSave}
			onCancel={handleCancelForm}
		/>
	{/if}

	{#if providers.length === 0 && !showForm}
		<div class="empty-providers">
			<p class="empty-text">No providers configured.</p>
			<p class="empty-hint">Add an OpenAI-compatible or Anthropic provider to get started.</p>
		</div>
	{:else}
		<ul class="provider-list" role="list">
			{#each providers as provider}
				<li class="provider-item">
					<div class="provider-info">
						<span class="provider-name">{provider.name}</span>
						<span
							class="provider-badge"
							class:openai={provider.format === 'openai'}
							class:anthropic={provider.format === 'anthropic'}
						>
							{provider.format === 'openai' ? 'OpenAI' : 'Anthropic'}
						</span>
					</div>
					<div class="provider-details">
						<span class="provider-model">{provider.model}</span>
						<span class="provider-url">{provider.baseURL}</span>
					</div>
					<div class="provider-actions">
						<button
							class="btn-action"
							onclick={() => handleEdit(provider)}
							aria-label={`Edit ${provider.name}`}
						>
							Edit
						</button>
						<button
							class="btn-action danger"
							onclick={() => handleDelete(provider.name)}
							aria-label={`Delete ${provider.name}`}
						>
							Delete
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.provider-settings {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: 640px;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-heading {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.btn-add {
		background-color: var(--color-primary);
		color: var(--color-primary-foreground);
		border: none;
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.btn-add:hover {
		background-color: var(--color-primary-hover);
	}

	.status-message {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		background-color: color-mix(in oklch, var(--color-success) 10%, transparent);
		color: var(--color-success);
		border: 1px solid var(--color-success);
	}

	.status-message.error {
		background-color: color-mix(in oklch, var(--color-error) 10%, transparent);
		color: var(--color-error);
		border-color: var(--color-error);
	}

	.empty-providers {
		padding: var(--space-8) var(--space-5);
		text-align: center;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-lg);
	}

	.empty-text {
		color: var(--color-text-secondary);
		font-size: var(--font-size-md);
		margin-bottom: var(--space-2);
	}

	.empty-hint {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.provider-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.provider-item {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		transition: border-color var(--transition-fast);
	}

	.provider-item:hover {
		border-color: var(--color-border-strong);
	}

	.provider-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 180px;
	}

	.provider-name {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		font-size: var(--font-size-md);
	}

	.provider-badge {
		font-size: var(--font-size-xs);
		padding: 2px 6px;
		border-radius: var(--radius-full);
		font-weight: var(--font-weight-medium);
	}

	.provider-badge.openai {
		background-color: color-mix(in oklch, var(--color-info) 12%, transparent);
		color: var(--color-info);
		border: 1px solid color-mix(in oklch, var(--color-info) 25%, transparent);
	}

	.provider-badge.anthropic {
		background-color: color-mix(in oklch, var(--color-warning) 12%, transparent);
		color: var(--color-warning);
		border: 1px solid color-mix(in oklch, var(--color-warning) 25%, transparent);
	}

	.provider-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.provider-model {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
	}

	.provider-url {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.provider-actions {
		display: flex;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.btn-action {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-1) var(--space-3);
		font-family: var(--font-sans);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.btn-action:hover {
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}

	.btn-action.danger:hover {
		color: var(--color-error);
		border-color: var(--color-error);
	}
</style>
