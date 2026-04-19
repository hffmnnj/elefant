<script lang="ts">
	// AgentRunTree — nested parent/child view of runs in a session.
	//
	// Navigation follows the WAI-ARIA tree pattern:
	//   - Up / Down: previous / next visible node
	//   - Right:     expand a collapsed node; if already expanded, move to first child
	//   - Left:      collapse an expanded node; if already collapsed, move to parent
	//   - Enter / Space: activate the focused node (opens + sets active run)
	//
	// Only the currently-focused node carries `tabindex=0`; siblings carry
	// `tabindex=-1` per the single-tab-stop pattern.

	import { agentRunsStore } from '$lib/stores/agent-runs.svelte.js';
	import type {
		AgentRun,
		AgentRunStatus,
		AgentRunTreeNode,
	} from '$lib/types/agent-run.js';
	import {
		HugeiconsIcon,
		ChevronDownIcon,
		ChevronRightIcon,
		CheckIcon,
		CloseIcon,
		ErrorIcon,
	} from '$lib/icons/index.js';

	type Props = {
		sessionId: string;
	};

	let { sessionId }: Props = $props();

	let focusedRunId = $state<string | null>(null);
	let expanded = $state<Record<string, boolean>>({});

	const tree = $derived<AgentRunTreeNode[]>(agentRunsStore.runTree(sessionId));

	// Flat list of visible nodes, in DFS order. Each entry carries its
	// depth and the runId of its parent (if any). This drives keyboard
	// navigation without having to re-walk the tree each keypress.
	type FlatEntry = {
		run: AgentRun;
		depth: number;
		parentRunId: string | null;
		hasChildren: boolean;
		isExpanded: boolean;
	};

	const flat = $derived<FlatEntry[]>(flattenTree(tree));

	function flattenTree(nodes: AgentRunTreeNode[]): FlatEntry[] {
		const out: FlatEntry[] = [];
		const walk = (node: AgentRunTreeNode, depth: number, parentRunId: string | null): void => {
			const isExpanded = expanded[node.run.runId] ?? true;
			out.push({
				run: node.run,
				depth,
				parentRunId,
				hasChildren: node.children.length > 0,
				isExpanded,
			});
			if (isExpanded) {
				for (const child of node.children) {
					walk(child, depth + 1, node.run.runId);
				}
			}
		};
		for (const root of nodes) {
			walk(root, 0, null);
		}
		return out;
	}

	function statusLabel(status: AgentRunStatus): string {
		switch (status) {
			case 'running':
				return 'Running';
			case 'done':
				return 'Complete';
			case 'error':
				return 'Error';
			case 'cancelled':
				return 'Cancelled';
		}
	}

	function focusNode(runId: string): void {
		focusedRunId = runId;
		// Move DOM focus to the matching treeitem after render.
		queueMicrotask(() => {
			const el = document.getElementById(treeItemId(runId));
			el?.focus();
		});
	}

	function treeItemId(runId: string): string {
		return `agent-run-tree-item-${runId}`;
	}

	function toggleExpanded(runId: string, next?: boolean): void {
		const prev = expanded[runId] ?? true;
		expanded = { ...expanded, [runId]: next ?? !prev };
	}

	function activate(runId: string): void {
		agentRunsStore.openRun(runId);
		agentRunsStore.setActiveRun(runId);
	}

	function handleKeyDown(e: KeyboardEvent, entry: FlatEntry): void {
		const index = flat.findIndex((f) => f.run.runId === entry.run.runId);
		if (index < 0) return;

		switch (e.key) {
			case 'ArrowDown': {
				const next = flat[index + 1];
				if (next) {
					e.preventDefault();
					focusNode(next.run.runId);
				}
				break;
			}
			case 'ArrowUp': {
				const prev = flat[index - 1];
				if (prev) {
					e.preventDefault();
					focusNode(prev.run.runId);
				}
				break;
			}
			case 'ArrowRight': {
				e.preventDefault();
				if (entry.hasChildren && !entry.isExpanded) {
					toggleExpanded(entry.run.runId, true);
				} else if (entry.hasChildren && entry.isExpanded) {
					// Jump to first child — the next flat entry after
					// expanded parents always is the first child.
					const next = flat[index + 1];
					if (next && next.parentRunId === entry.run.runId) {
						focusNode(next.run.runId);
					}
				}
				break;
			}
			case 'ArrowLeft': {
				e.preventDefault();
				if (entry.hasChildren && entry.isExpanded) {
					toggleExpanded(entry.run.runId, false);
				} else if (entry.parentRunId) {
					focusNode(entry.parentRunId);
				}
				break;
			}
			case 'Enter':
			case ' ': {
				e.preventDefault();
				activate(entry.run.runId);
				break;
			}
			case 'Home': {
				if (flat[0]) {
					e.preventDefault();
					focusNode(flat[0].run.runId);
				}
				break;
			}
			case 'End': {
				const last = flat[flat.length - 1];
				if (last) {
					e.preventDefault();
					focusNode(last.run.runId);
				}
				break;
			}
		}
	}

	// When tree membership changes and no node is focused yet, focus the
	// first root so keyboard users can start navigating.
	$effect(() => {
		if (focusedRunId === null && flat.length > 0) {
			focusedRunId = flat[0].run.runId;
		}
		// If the focused node was removed from the tree, fall back.
		if (focusedRunId && !flat.some((f) => f.run.runId === focusedRunId)) {
			focusedRunId = flat[0]?.run.runId ?? null;
		}
	});

	async function handleCancelClick(runId: string, e: MouseEvent): Promise<void> {
		e.stopPropagation();
		await agentRunsStore.cancel(runId);
	}

	function handleToggleClick(runId: string, e: MouseEvent): void {
		e.stopPropagation();
		toggleExpanded(runId);
	}
</script>

{#if flat.length === 0}
	<div class="empty" role="status">
		No agent runs in this session yet.
	</div>
{:else}
	<ul class="tree" role="tree" aria-label="Agent runs">
		{#each flat as entry (entry.run.runId)}
			{@const isFocused = focusedRunId === entry.run.runId}
			{@const isActive = agentRunsStore.activeRunId === entry.run.runId}
			<li
				class="tree-item"
				role="treeitem"
				id={treeItemId(entry.run.runId)}
				aria-level={entry.depth + 1}
				aria-expanded={entry.hasChildren ? entry.isExpanded : undefined}
				aria-selected={isActive}
				tabindex={isFocused ? 0 : -1}
				style="padding-left: calc(var(--space-3) + {entry.depth} * var(--space-4))"
				class:active={isActive}
				onclick={() => activate(entry.run.runId)}
				onkeydown={(e) => handleKeyDown(e, entry)}
			>
				<button
					type="button"
					class="chevron"
					aria-hidden={!entry.hasChildren}
					aria-label={entry.hasChildren
						? entry.isExpanded
							? 'Collapse children'
							: 'Expand children'
						: undefined}
					tabindex="-1"
					disabled={!entry.hasChildren}
					onclick={(e) => handleToggleClick(entry.run.runId, e)}
				>
					{#if entry.hasChildren}
						<HugeiconsIcon
							icon={entry.isExpanded ? ChevronDownIcon : ChevronRightIcon}
							size={12}
							strokeWidth={2}
						/>
					{/if}
				</button>

				<span
					class="status-icon status-{entry.run.status}"
					role="img"
					aria-label={statusLabel(entry.run.status)}
					title={statusLabel(entry.run.status)}
				>
					{#if entry.run.status === 'running'}
						<span class="spinner" aria-hidden="true"></span>
					{:else if entry.run.status === 'done'}
						<HugeiconsIcon icon={CheckIcon} size={12} strokeWidth={2.5} />
					{:else if entry.run.status === 'error'}
						<HugeiconsIcon icon={ErrorIcon} size={12} strokeWidth={2} />
					{:else if entry.run.status === 'cancelled'}
						<span aria-hidden="true">—</span>
					{/if}
				</span>

				<span class="title" title={entry.run.title}>{entry.run.title}</span>
				<span class="agent-type" aria-hidden="true">{entry.run.agentType}</span>

				{#if entry.run.status === 'running'}
					<button
						type="button"
						class="cancel"
						aria-label="Cancel {entry.run.title}"
						tabindex="-1"
						onclick={(e) => handleCancelClick(entry.run.runId, e)}
					>
						<HugeiconsIcon icon={CloseIcon} size={11} strokeWidth={2} />
						<span class="cancel-label">Cancel</span>
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.tree {
		list-style: none;
		margin: 0;
		padding: var(--space-2) 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.tree-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding-right: var(--space-3);
		padding-block: var(--space-2);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		transition: background-color var(--transition-fast);
		user-select: none;
		min-width: 0;
	}

	.tree-item:hover {
		background-color: var(--color-surface-hover);
	}

	.tree-item.active {
		background-color: color-mix(
			in srgb,
			var(--color-primary, #3b82f6) 12%,
			transparent
		);
	}

	.tree-item:focus {
		outline: none;
		box-shadow: var(--glow-focus);
	}

	.chevron {
		width: 18px;
		height: 18px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		flex-shrink: 0;
		border-radius: var(--radius-sm);
	}

	.chevron:hover:not(:disabled) {
		background-color: var(--color-surface);
		color: var(--color-text-primary);
	}

	.chevron:disabled {
		cursor: default;
		opacity: 0.35;
	}

	.status-icon {
		width: 18px;
		height: 18px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		flex-shrink: 0;
		font-size: var(--font-size-xs);
	}

	.status-running {
		color: var(--color-primary);
	}

	.status-done {
		color: var(--color-success, #10b981);
	}

	.status-error {
		color: var(--color-error, #ef4444);
	}

	.status-cancelled {
		color: var(--color-text-muted);
	}

	.spinner {
		width: 10px;
		height: 10px;
		border-radius: 9999px;
		border: 2px solid currentColor;
		border-right-color: transparent;
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.agent-type {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		flex-shrink: 0;
		text-transform: lowercase;
	}

	.cancel {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 2px var(--space-2);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-error);
		background: transparent;
		border: 1px solid color-mix(in srgb, var(--color-error) 40%, transparent);
		border-radius: var(--radius-sm);
		cursor: pointer;
		flex-shrink: 0;
		font-family: var(--font-sans);
	}

	.cancel:hover {
		background-color: color-mix(in srgb, var(--color-error) 10%, transparent);
	}

	.cancel:focus-visible {
		outline: none;
		box-shadow: var(--glow-focus);
	}

	.empty {
		padding: var(--space-6);
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 640px) {
		.cancel-label {
			display: none;
		}
	}
</style>
