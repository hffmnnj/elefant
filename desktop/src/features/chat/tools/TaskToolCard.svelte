<script lang="ts">
	// TaskToolCard — chat-surface adapter that renders an `AgentTaskCard`
	// for `task` tool calls in the assistant transcript.
	//
	// The chat surface only sees a `ToolCallDisplay` (id, name, arguments,
	// result) — it does NOT carry the parent run id or a direct child
	// runId pointer. The agent-runs store is the source of truth for
	// every spawned child run in the project, so we resolve the child
	// reactively by matching the spawned run's `title` against the
	// `description` argument the model passed to `task`.
	//
	// This mirrors the proven title-match fallback used by
	// `agent-run-transcript-blocks.ts` for `task` blocks in
	// AgentRunTranscript: when daemon-side metadata routing isn't
	// available in the local context, the (description → spawned title)
	// pairing is the next best deterministic key.

	import { agentRunsStore } from '$lib/stores/agent-runs.svelte.js';
	import { navigationStore } from '$lib/stores/navigation.svelte.js';
	import AgentTaskCard from '$features/agent-runs/AgentTaskCard.svelte';
	import type { ToolCardProps } from './types.js';
	import {
		extractTaskAgentType,
		extractTaskDescription,
		resolveTaskToolCardChildRunId,
	} from './task-tool-card-state.js';

	let { toolCall }: ToolCardProps = $props();

	// All derivations live in the pure `task-tool-card-state` module so
	// they can be unit tested without a component renderer (see
	// TaskToolCard.test.ts).
	const description = $derived(extractTaskDescription(toolCall));
	const agentType = $derived(extractTaskAgentType(toolCall));

	// Re-runs whenever `agentRunsStore.runs` changes — i.e. as soon as
	// the matching `agent_run.spawned` SSE event lands.
	const resolvedRunId = $derived.by<string | null>(() =>
		resolveTaskToolCardChildRunId(description, agentRunsStore.runs),
	);

	function handleOpenChildRun(runId: string): void {
		navigationStore.openChildRun(runId);
	}
</script>

{#if !resolvedRunId}
	<!-- Pre-resolution placeholder. Mirrors AgentTaskCard's "spawning"
	     visual so the card layout doesn't reflow once the child id
	     resolves and AgentTaskCard takes over. -->
	<div
		class="task-card-placeholder"
		role="status"
		aria-live="polite"
		aria-label="Starting agent task: {description || 'Untitled task'}"
	>
		<span class="placeholder-spinner" aria-hidden="true"></span>
		<span class="placeholder-body">
			<span class="placeholder-title">{description || 'Untitled task'}</span>
			<span class="placeholder-status">Starting…</span>
		</span>
	</div>
{:else}
	<AgentTaskCard
		title={description}
		{agentType}
		toolCallId={toolCall.id}
		parentRunId=""
		{resolvedRunId}
		onOpenChildRun={handleOpenChildRun}
	/>
{/if}

<style>
	.task-card-placeholder {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		margin: var(--space-2) 0;
		min-height: 56px;
		width: 100%;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-info);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.placeholder-spinner {
		display: inline-block;
		width: 12px;
		height: 12px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-info);
		border-radius: var(--radius-full);
		animation: spin 0.9s linear infinite;
		flex-shrink: 0;
	}

	.placeholder-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.placeholder-title {
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.placeholder-status {
		font-size: var(--font-size-xs);
		font-style: italic;
		color: var(--color-info);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.placeholder-spinner {
			animation: none;
		}
	}
</style>
