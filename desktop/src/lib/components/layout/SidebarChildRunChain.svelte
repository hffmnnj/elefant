<script lang="ts">
	// SidebarChildRunChain — indented list of active child-run rows
	// surfaced beneath a session row (MH3).
	//
	// The chain is the ancestor path from the session's root run down
	// to the currently-active child run, minus the root itself (the
	// session row already represents the root). Each row is indented
	// in proportion to its depth in the tree.
	//
	// The component is intentionally presentational — visibility rules
	// and row computation live in the parent via
	// `computeSidebarChildRunChain`. Callers pass the resolved rows and
	// the click handler; we just draw them.

	import type { SidebarChildRunRow } from './sidebar-child-run-chain-state.js';
	import { buildChildRunRowIndent } from './sidebar-child-run-chain-state.js';

	type Props = {
		rows: SidebarChildRunRow[];
		/** Active child run id — used to highlight the current row. */
		activeChildRunId: string | null;
		onSelectRun: (runId: string) => void;
	};

	let { rows, activeChildRunId, onSelectRun }: Props = $props();

	function handleKeydown(event: KeyboardEvent, runId: string): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onSelectRun(runId);
		}
	}

	function rowLabel(title: string): string {
		return title.trim() || 'Untitled run';
	}
</script>

{#if rows.length > 0}
	<ul class="child-run-chain" role="list" aria-label="Active child run chain">
		{#each rows as row (row.run.runId)}
			<li>
				<button
					type="button"
					class="child-run-row"
					class:active={activeChildRunId === row.run.runId}
					aria-current={activeChildRunId === row.run.runId ? 'page' : undefined}
					aria-label="Open child run {rowLabel(row.run.title)}"
					style="padding-left: {buildChildRunRowIndent(row.depth)};"
					onclick={() => onSelectRun(row.run.runId)}
					onkeydown={(e) => handleKeydown(e, row.run.runId)}
				>
					<span class="chain-connector" aria-hidden="true">└─</span>
					<span class="child-run-label" title={rowLabel(row.run.title)}>
						{rowLabel(row.run.title)}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.child-run-chain {
		list-style: none;
		margin: var(--space-1) 0;
		padding: 0 0 0 var(--space-6);
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.child-run-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-1) var(--space-2);
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		text-align: left;
		font-family: var(--font-sans);
		font-size: var(--font-size-sm);
		transition:
			color var(--transition-fast),
			background-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.child-run-row:hover {
		color: var(--color-text-primary);
		background-color: var(--color-surface-hover);
	}

	.child-run-row:focus-visible {
		outline: none;
		box-shadow: var(--glow-focus);
	}

	.child-run-row.active {
		color: var(--color-primary);
		background-color: var(--color-primary-subtle);
	}

	.chain-connector {
		display: inline-block;
		color: var(--color-text-disabled);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		flex-shrink: 0;
		user-select: none;
	}

	.child-run-label {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
