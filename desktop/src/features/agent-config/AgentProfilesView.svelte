<script lang="ts">
	// AgentProfilesView — grid view of all agent profiles.
	//
	// Delegates persistence to `agentConfigStore`. Shows loading, empty,
	// and error states. Renders an `AgentProfileCard` per profile, grouped
	// by kind so the list scans predictably as it grows.

	import { onMount } from 'svelte';
	import { agentConfigStore } from '$lib/stores/agent-config.svelte.js';
	import type { AgentKind, AgentProfile } from '$lib/types/agent-config.js';
	import { AGENT_KINDS } from '$lib/types/agent-config.js';
	import AgentProfileCard from './AgentProfileCard.svelte';

	type Props = {
		// Optional initial-expanded card id — useful when deep-linking from
		// elsewhere in the app (e.g. the override dialog offers "edit profile").
		initialExpandedId?: string;
	};

	let { initialExpandedId }: Props = $props();

	onMount(() => {
		void agentConfigStore.refresh();
	});

	const profiles = $derived(agentConfigStore.profiles);
	const isLoading = $derived(agentConfigStore.isLoading);
	const lastError = $derived(agentConfigStore.lastError);

	// Stable group order — matches AGENT_KINDS declaration order so the
	// view doesn't shuffle when profiles are added.
	const groupedProfiles = $derived<Array<{ kind: AgentKind; items: AgentProfile[] }>>(
		AGENT_KINDS
			.map((kind) => ({
				kind,
				items: profiles.filter((p) => p.kind === kind),
			}))
			.filter((group) => group.items.length > 0),
	);

	function kindLabel(kind: AgentKind): string {
		switch (kind) {
			case 'primary':
				return 'Primary';
			case 'planner':
				return 'Planner';
			case 'executor':
				return 'Executor';
			case 'researcher':
				return 'Researcher';
			case 'reviewer':
				return 'Reviewer';
			case 'background':
				return 'Background';
		}
	}

	async function handleRetry(): Promise<void> {
		await agentConfigStore.refresh();
	}
</script>

<section class="view" aria-labelledby="agent-profiles-title">
	<header class="view-header">
		<div class="view-heading">
			<h2 id="agent-profiles-title" class="view-title">Agent Profiles</h2>
			<p class="view-subtitle">
				Configure the agents Elefant can run. Each profile layers on top of
				the global default — project overrides win where set.
			</p>
		</div>
		<button
			type="button"
			class="refresh-button"
			onclick={handleRetry}
			disabled={isLoading}
			aria-label="Refresh profiles"
		>
			{isLoading ? 'Loading…' : 'Refresh'}
		</button>
	</header>

	{#if lastError}
		<div class="alert alert-error" role="alert">
			<strong>Could not load profiles.</strong>
			<span>{lastError}</span>
			<button type="button" class="alert-action" onclick={handleRetry}>
				Try again
			</button>
		</div>
	{/if}

	{#if isLoading && profiles.length === 0}
		<div class="placeholder" aria-busy="true" aria-live="polite">
			Loading agent profiles…
		</div>
	{:else if !lastError && profiles.length === 0}
		<div class="placeholder empty" aria-live="polite">
			<p>No agent profiles configured yet.</p>
			<p class="empty-hint">
				Profiles live in <code>~/.config/elefant/elefant.config.json</code>
				(global) or <code>.elefant/config.json</code> (project).
			</p>
		</div>
	{:else}
		<div class="groups">
			{#each groupedProfiles as group (group.kind)}
				<section class="group" aria-labelledby="group-{group.kind}">
					<h3 id="group-{group.kind}" class="group-title">
						<span class="group-dot group-dot-{group.kind}" aria-hidden="true"
						></span>
						{kindLabel(group.kind)}
						<span class="group-count">{group.items.length}</span>
					</h3>
					<ul class="card-grid">
						{#each group.items as profile (profile.id)}
							<li>
								<AgentProfileCard
									{profile}
									initialExpanded={profile.id === initialExpandedId}
								/>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</section>

<style>
	.view {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: var(--space-6);
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.view-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.view-heading {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.view-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		letter-spacing: var(--tracking-snug);
		margin: 0;
	}

	.view-subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		line-height: var(--line-height-relaxed);
		margin: 0;
		max-width: 64ch;
	}

	.refresh-button {
		padding: var(--space-2) var(--space-4);
		font-family: var(--font-sans);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		background: transparent;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.refresh-button:hover:not(:disabled) {
		background-color: var(--color-surface-hover);
	}

	.refresh-button:focus-visible {
		outline: none;
		box-shadow: var(--glow-focus);
	}

	.refresh-button:disabled {
		cursor: progress;
		opacity: 0.6;
	}

	.alert {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		font-size: var(--font-size-sm);
	}

	.alert-error {
		background-color: color-mix(
			in srgb,
			var(--color-error, #b23a3a) 12%,
			transparent
		);
		border-color: color-mix(
			in srgb,
			var(--color-error, #b23a3a) 50%,
			transparent
		);
		color: var(--color-text-primary);
	}

	.alert-action {
		margin-left: auto;
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text-primary);
		font-size: var(--font-size-xs);
		cursor: pointer;
	}

	.alert-action:hover {
		background-color: var(--color-surface-hover);
	}

	.placeholder {
		padding: var(--space-8) var(--space-6);
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		background-color: var(--color-surface);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-lg);
	}

	.placeholder.empty p {
		margin: 0;
	}

	.empty-hint {
		margin-top: var(--space-2) !important;
		font-size: var(--font-size-xs);
		color: var(--color-text-disabled);
	}

	.empty-hint code {
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs, 10px);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background-color: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.group-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		margin: 0 0 var(--space-3);
	}

	.group-dot {
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background-color: var(--color-text-muted);
	}

	.group-dot-primary {
		background-color: var(--color-primary);
	}
	.group-dot-planner {
		background-color: var(--color-info, var(--color-text-muted));
	}
	.group-dot-executor {
		background-color: var(--color-success, var(--color-text-muted));
	}
	.group-dot-reviewer {
		background-color: var(--color-warning, var(--color-text-muted));
	}

	.group-count {
		font-family: var(--font-mono);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-disabled);
	}

	.card-grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: var(--space-4);
	}

	@media (max-width: 640px) {
		.view {
			padding: var(--space-4);
		}

		.view-header {
			flex-direction: column;
		}

		.card-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
