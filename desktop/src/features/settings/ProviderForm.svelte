<script lang="ts">
	import type { ProviderEntry, ProviderFormat } from '$lib/daemon/types.js';

	type Props = {
		provider?: ProviderEntry;
		onSave: (provider: ProviderEntry) => void;
		onCancel: () => void;
	};

	let { provider, onSave, onCancel }: Props = $props();

	const isEditing = $derived(!!provider);

	let name = $state(provider?.name ?? '');
	let baseURL = $state(provider?.baseURL ?? '');
	let apiKey = $state(provider?.apiKey ?? '');
	let model = $state(provider?.model ?? '');
	let format = $state<ProviderFormat>(provider?.format ?? 'openai');
	let showApiKey = $state(false);
	let errors = $state<Record<string, string>>({});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!name.trim()) newErrors.name = 'Name is required';
		if (!baseURL.trim()) {
			newErrors.baseURL = 'Base URL is required';
		} else {
			try {
				new URL(baseURL);
			} catch {
				newErrors.baseURL = 'Must be a valid URL';
			}
		}
		if (!apiKey.trim()) newErrors.apiKey = 'API key is required';
		if (!model.trim()) newErrors.model = 'Model is required';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSave(): void {
		if (!validate()) return;
		onSave({
			name: name.trim(),
			baseURL: baseURL.trim(),
			apiKey: apiKey.trim(),
			model: model.trim(),
			format,
		});
	}
</script>

<div class="provider-form">
	<h4 class="form-title">{isEditing ? 'Edit Provider' : 'Add Provider'}</h4>

	<div class="form-fields">
		<div class="form-group">
			<label class="field-label" for="prov-name">Name</label>
			<input
				id="prov-name"
				type="text"
				class="field-input"
				class:field-error={!!errors.name}
				bind:value={name}
				placeholder="my-provider"
				disabled={isEditing}
				aria-invalid={!!errors.name}
			/>
			{#if errors.name}<span class="error-text">{errors.name}</span>{/if}
		</div>

		<div class="form-group">
			<label class="field-label" for="prov-format">Format</label>
			<select id="prov-format" class="field-select" bind:value={format}>
				<option value="openai">OpenAI-compatible</option>
				<option value="anthropic">Anthropic</option>
			</select>
		</div>

		<div class="form-group">
			<label class="field-label" for="prov-baseurl">Base URL</label>
			<input
				id="prov-baseurl"
				type="url"
				class="field-input"
				class:field-error={!!errors.baseURL}
				bind:value={baseURL}
				placeholder="https://api.openai.com"
				aria-invalid={!!errors.baseURL}
			/>
			{#if errors.baseURL}<span class="error-text">{errors.baseURL}</span>{/if}
		</div>

		<div class="form-group">
			<label class="field-label" for="prov-model">Model</label>
			<input
				id="prov-model"
				type="text"
				class="field-input"
				class:field-error={!!errors.model}
				bind:value={model}
				placeholder="gpt-4o-mini"
				aria-invalid={!!errors.model}
			/>
			{#if errors.model}<span class="error-text">{errors.model}</span>{/if}
		</div>

		<div class="form-group">
			<label class="field-label" for="prov-apikey">API Key</label>
			<div class="api-key-input">
				<input
					id="prov-apikey"
					type={showApiKey ? 'text' : 'password'}
					class="field-input"
					class:field-error={!!errors.apiKey}
					bind:value={apiKey}
					placeholder="sk-..."
					autocomplete="off"
					aria-invalid={!!errors.apiKey}
				/>
				<button
					class="toggle-visibility"
					type="button"
					onclick={() => (showApiKey = !showApiKey)}
					aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
				>
					{showApiKey ? 'Hide' : 'Show'}
				</button>
			</div>
			{#if errors.apiKey}<span class="error-text">{errors.apiKey}</span>{/if}
		</div>
	</div>

	<div class="form-actions">
		<button class="btn-primary" onclick={handleSave}>
			{isEditing ? 'Update Provider' : 'Add Provider'}
		</button>
		<button class="btn-secondary" onclick={onCancel}>Cancel</button>
	</div>
</div>

<style>
	.provider-form {
		background-color: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field-label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
	}

	.field-input,
	.field-select {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-family: var(--font-sans);
		font-size: var(--font-size-md);
		padding: var(--space-2) var(--space-3);
		width: 100%;
		outline: none;
		transition: border-color var(--transition-fast);
	}

	.field-input:focus,
	.field-select:focus {
		border-color: var(--color-primary);
	}

	.field-input.field-error {
		border-color: var(--color-error);
	}

	.error-text {
		font-size: var(--font-size-xs);
		color: var(--color-error);
	}

	.api-key-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.api-key-input .field-input {
		padding-right: 60px;
	}

	.toggle-visibility {
		position: absolute;
		right: var(--space-2);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		padding: 2px var(--space-2);
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.toggle-visibility:hover {
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}

	.form-actions {
		display: flex;
		gap: var(--space-3);
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: var(--color-primary-foreground);
		border: none;
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.btn-primary:hover {
		background-color: var(--color-primary-hover);
	}

	.btn-secondary {
		background-color: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
		font-size: var(--font-size-md);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.btn-secondary:hover {
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}
</style>
