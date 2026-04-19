<script lang="ts">
	// AgentProfileCard — single agent profile tile.
	//
	// Collapsed view shows identity (label, kind badge, id), a short status
	// strip (provider • model • toolMode), and an enabled toggle. When
	// expanded the card reveals the "effective config" table with a layer
	// badge (Global / Project / Override) per field, sourced from the
	// daemon's `_sources` attribution on `ResolvedAgentConfig`.

	import type { Snippet } from 'svelte';
	import { agentConfigStore } from '$lib/stores/agent-config.svelte.js';
	import type {
		AgentProfile,
		ResolvedAgentConfig,
		ConfigLayer,
	} from '$lib/types/agent-config.js';
	import { getFieldLayer } from '$lib/types/agent-config.js';
	import {
		HugeiconsIcon,
		ChevronDownIcon,
		ChevronRightIcon,
	} from '$lib/icons/index.js';

	type Props = {
		profile: AgentProfile;
		initialExpanded?: boolean;
		onToggleEnabled?: (profile: AgentProfile, next: boolean) => void;
		children?: Snippet<[{ resolved: ResolvedAgentConfig | null }]>;
	};

	let { profile, initialExpanded = false, onToggleEnabled, children }: Props =
		$props();

	let expanded = $state(initialExpanded);
	let isTogglingEnabled = $state(false);

	// Resolved view for this agentId, if already fetched.
	const resolved = $derived<ResolvedAgentConfig | null>(
		agentConfigStore.resolvedByAgentId[profile.id] ?? null,
	);

	// Lazy-load the resolved detail the first time the card expands.
	$effect(() => {
		if (expanded && !resolved) {
			void agentConfigStore.loadResolved(profile.id);
		}
	});

	// Prefer the resolved profile when rendering field values so the user
	// sees effective config, not just the raw profile layer.
	const effective = $derived<AgentProfile>(resolved ?? profile);

	async function handleToggle(event: Event): Promise<void> {
		const next = (event.currentTarget as HTMLInputElement).checked;
		if (isTogglingEnabled) return;
		isTogglingEnabled = true;
		try {
			await agentConfigStore.update(profile.id, { enabled: next });
			onToggleEnabled?.(profile, next);
		} finally {
			isTogglingEnabled = false;
		}
	}

	function toggleExpanded(): void {
		expanded = !expanded;
	}

	function formatTimeout(ms: number): string {
		if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
		if (ms >= 1000) return `${(ms / 1000).toFixed(0)}s`;
		return `${ms}ms`;
	}

	// Dotted field paths that match the daemon's `_sources` attribution.
	type Field = {
		path: string;
		label: string;
		render: (p: AgentProfile) => string;
	};

	const fields: Field[] = [
		{
			path: 'behavior.provider',
			label: 'Provider',
			render: (p) => p.behavior.provider ?? '—',
		},
		{
			path: 'behavior.model',
			label: 'Model',
			render: (p) => p.behavior.model ?? '—',
		},
		{
			path: 'behavior.temperature',
			label: 'Temperature',
			render: (p) =>
				p.behavior.temperature !== undefined
					? p.behavior.temperature.toFixed(2)
					: '—',
		},
		{
			path: 'behavior.topP',
			label: 'Top P',
			render: (p) =>
				p.behavior.topP !== undefined ? p.behavior.topP.toFixed(2) : '—',
		},
		{
			path: 'behavior.maxTokens',
			label: 'Max Tokens',
			render: (p) =>
				p.behavior.maxTokens !== undefined
					? p.behavior.maxTokens.toLocaleString()
					: '—',
		},
		{
			path: 'limits.maxIterations',
			label: 'Max Iterations',
			render: (p) => String(p.limits.maxIterations),
		},
		{
			path: 'limits.timeoutMs',
			label: 'Timeout',
			render: (p) => formatTimeout(p.limits.timeoutMs),
		},
		{
			path: 'limits.maxConcurrency',
			label: 'Max Concurrency',
			render: (p) => String(p.limits.maxConcurrency),
		},
		{
			path: 'tools.mode',
			label: 'Tool Mode',
			render: (p) => p.tools.mode,
		},
	];

	function layerClass(layer: ConfigLayer): string {
		return `layer-${layer}`;
	}
</script>

<article
	class="card"
	class:card-expanded={expanded}
	class:card-disabled={!profile.enabled}
	aria-labelledby="profile-title-{profile.id}"
>
	<header class="card-header">
		<button
			type="button"
			class="expand-button"
			aria-expanded={expanded}
			aria-controls="profile-body-{profile.id}"
			onclick={toggleExpanded}
		>
			<HugeiconsIcon
				icon={expanded ? ChevronDownIcon : ChevronRightIcon}
				size={14}
				strokeWidth={2}
			/>
			<span class="sr-only">
				{expanded ? 'Collapse' : 'Expand'} {profile.label}
			</span>
		</button>

		<div class="identity">
			<h3 id="profile-title-{profile.id}" class="identity-label">
				{profile.label}
			</h3>
			<p class="identity-id" title={profile.id}>{profile.id}</p>
		</div>

		<span class="kind-badge kind-{profile.kind}" aria-label="Agent kind">
			{profile.kind}
		</span>

		<label class="enabled-switch" aria-label="Enable profile {profile.label}">
			<input
				type="checkbox"
				checked={profile.enabled}
				disabled={isTogglingEnabled}
				onchange={handleToggle}
			/>
			<span class="switch-track" aria-hidden="true">
				<span class="switch-thumb"></span>
			</span>
			<span class="switch-text">{profile.enabled ? 'Enabled' : 'Disabled'}</span>
		</label>
	</header>

	{#if profile.description}
		<p class="card-description">{profile.description}</p>
	{/if}

	<dl class="summary-strip" aria-label="Quick summary">
		<div class="summary-cell">
			<dt>Provider</dt>
			<dd>{effective.behavior.provider ?? '—'}</dd>
		</div>
		<div class="summary-cell">
			<dt>Model</dt>
			<dd>{effective.behavior.model ?? '—'}</dd>
		</div>
		<div class="summary-cell">
			<dt>Tools</dt>
			<dd>{effective.tools.mode}</dd>
		</div>
	</dl>

	{#if expanded}
		<section
			id="profile-body-{profile.id}"
			class="card-body"
			aria-label="Effective configuration"
		>
			<div class="fields-grid" role="list">
				{#each fields as field (field.path)}
					{@const layer = getFieldLayer(resolved, field.path)}
					<div class="field-row" role="listitem">
						<span class="field-label">{field.label}</span>
						<span class="field-value">{field.render(effective)}</span>
						<span
							class="layer-badge {layerClass(layer)}"
							title="This value comes from the {layer} layer"
						>
							{layer}
						</span>
					</div>
				{/each}
			</div>

			{@render children?.({ resolved })}
		</section>
	{/if}
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.card:hover {
		border-color: var(--color-border-strong);
	}

	.card-expanded {
		box-shadow: var(--shadow-md);
	}

	.card-disabled {
		opacity: 0.72;
	}

	.card-header {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: var(--space-3);
	}

	.expand-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			background-color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.expand-button:hover {
		color: var(--color-text-primary);
		background-color: var(--color-surface-hover);
	}

	.expand-button:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: var(--glow-focus);
	}

	.identity {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.identity-label {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		letter-spacing: var(--tracking-snug);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.identity-id {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.kind-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs, 10px);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-text-secondary);
		background-color: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
	}

	.kind-primary {
		color: var(--color-primary);
		border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
	}
	.kind-planner {
		color: var(--color-info, var(--color-text-secondary));
	}
	.kind-executor {
		color: var(--color-success, var(--color-text-secondary));
	}
	.kind-reviewer {
		color: var(--color-warning, var(--color-text-secondary));
	}

	.enabled-switch {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
		user-select: none;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.enabled-switch input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.switch-track {
		position: relative;
		display: inline-block;
		width: 32px;
		height: 18px;
		border-radius: 9999px;
		background-color: var(--color-border-strong);
		transition: background-color var(--transition-fast);
	}

	.enabled-switch input:checked + .switch-track {
		background-color: var(--color-primary);
	}

	.enabled-switch input:focus-visible + .switch-track {
		box-shadow: var(--glow-focus);
	}

	.switch-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		border-radius: 9999px;
		background-color: var(--color-primary-foreground, #fff);
		transition: transform var(--transition-fast);
	}

	.enabled-switch input:checked + .switch-track .switch-thumb {
		transform: translateX(14px);
	}

	.enabled-switch input:disabled + .switch-track {
		opacity: 0.6;
		cursor: progress;
	}

	.switch-text {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
	}

	.card-description {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		line-height: var(--line-height-relaxed);
		margin: 0;
	}

	.summary-strip {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
		margin: 0;
		padding: var(--space-3);
		background-color: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.summary-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.summary-cell dt {
		font-size: var(--font-size-2xs, 10px);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
	}

	.summary-cell dd {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-2);
		border-top: 1px solid var(--color-border);
	}

	.fields-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-2);
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) 0;
		border-bottom: 1px dashed var(--color-border);
	}

	.field-row:last-child {
		border-bottom: none;
	}

	.field-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.field-value {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		text-align: right;
	}

	.layer-badge {
		display: inline-flex;
		align-items: center;
		padding: 1px var(--space-2);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs, 10px);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		min-width: 58px;
		justify-content: center;
	}

	.layer-global {
		background-color: color-mix(
			in srgb,
			var(--color-text-muted) 16%,
			transparent
		);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
	}

	.layer-project {
		background-color: color-mix(in srgb, var(--color-primary) 16%, transparent);
		color: var(--color-primary);
		border: 1px solid
			color-mix(in srgb, var(--color-primary) 40%, transparent);
	}

	.layer-override {
		background-color: color-mix(
			in srgb,
			var(--color-warning, #b88400) 18%,
			transparent
		);
		color: var(--color-warning, #b88400);
		border: 1px solid
			color-mix(in srgb, var(--color-warning, #b88400) 40%, transparent);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 640px) {
		.card-header {
			grid-template-columns: auto 1fr auto;
			row-gap: var(--space-2);
		}

		.enabled-switch {
			grid-column: 1 / -1;
			justify-self: end;
		}

		.summary-strip {
			grid-template-columns: 1fr 1fr;
		}

		.field-row {
			grid-template-columns: 1fr auto;
		}

		.layer-badge {
			grid-column: 2;
		}

		.field-value {
			grid-column: 1 / -1;
			text-align: left;
		}
	}
</style>
