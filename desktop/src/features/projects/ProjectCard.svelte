<script lang="ts">
	// ProjectCard — a single project tile in the Project Picker grid.
	//
	// - Body click / Enter / Space emits `select`
	// - Hover (or keyboard focus) reveals rename + delete icon buttons
	// - Rename / delete emit their own events; wiring arrives in later tasks

	import type { Project } from '$lib/types/project.js';
	import {
		HugeiconsIcon,
		EditIcon,
		DeleteIcon,
	} from '$lib/icons/index.js';
	import ProjectAvatar from './ProjectAvatar.svelte';

	type Props = {
		project: Project;
		onSelect?: (project: Project) => void;
		onRename?: (project: Project) => void;
		onDelete?: (project: Project) => void;
	};

	let { project, onSelect, onRename, onDelete }: Props = $props();

	// --- Relative time formatting -----------------------------------------
	// Lightweight "N units ago" formatter backed by Intl.RelativeTimeFormat.
	// No new dependency, respects the user's locale.
	const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
		numeric: 'auto',
	});

	const UNITS: ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
		{ unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
		{ unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
		{ unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
		{ unit: 'day', ms: 24 * 60 * 60 * 1000 },
		{ unit: 'hour', ms: 60 * 60 * 1000 },
		{ unit: 'minute', ms: 60 * 1000 },
		{ unit: 'second', ms: 1000 },
	];

	function formatRelative(iso: string): string {
		const then = new Date(iso).getTime();
		if (Number.isNaN(then)) return '';
		const deltaMs = then - Date.now();
		const abs = Math.abs(deltaMs);
		for (const { unit, ms } of UNITS) {
			if (abs >= ms || unit === 'second') {
				const value = Math.round(deltaMs / ms);
				return relativeFormatter.format(value, unit);
			}
		}
		return '';
	}

	const relativeTime = $derived(formatRelative(project.updatedAt));

	// Truncate the path in the middle so the head (root) and tail (folder)
	// both stay visible, which matches how most OS file pickers render.
	function truncatePath(path: string, max = 48): string {
		if (path.length <= max) return path;
		const keep = Math.floor((max - 1) / 2);
		return `${path.slice(0, keep)}…${path.slice(path.length - keep)}`;
	}

	const displayPath = $derived(truncatePath(project.path));

	// --- Event handlers ---------------------------------------------------
	function handleSelect(): void {
		onSelect?.(project);
	}

	function handleCardKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleSelect();
		}
	}

	function handleRename(event: MouseEvent): void {
		// Stop the click from bubbling up to the card body.
		event.stopPropagation();
		onRename?.(project);
	}

	function handleDelete(event: MouseEvent): void {
		event.stopPropagation();
		onDelete?.(project);
	}
</script>

<div
	class="card"
	role="button"
	tabindex="0"
	aria-label="Open project {project.name}"
	onclick={handleSelect}
	onkeydown={handleCardKeydown}
>
	<div class="card-body">
		<ProjectAvatar projectId={project.id} name={project.name} size={44} />

		<div class="card-text">
			<h3 class="card-title" title={project.name}>{project.name}</h3>
			<p class="card-path" title={project.path}>{displayPath}</p>
			{#if relativeTime}
				<p class="card-meta">
					<span class="meta-label">Opened</span>
					<span class="meta-value">{relativeTime}</span>
				</p>
			{/if}
		</div>
	</div>

	<div class="card-actions" aria-label="Project actions">
		<button
			type="button"
			class="icon-button"
			aria-label="Rename {project.name}"
			onclick={handleRename}
		>
			<HugeiconsIcon icon={EditIcon} size={16} strokeWidth={1.5} />
		</button>
		<button
			type="button"
			class="icon-button icon-button-danger"
			aria-label="Delete {project.name}"
			onclick={handleDelete}
		>
			<HugeiconsIcon icon={DeleteIcon} size={16} strokeWidth={1.5} />
		</button>
	</div>
</div>

<style>
	.card {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		text-align: left;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast),
			box-shadow var(--transition-fast),
			transform var(--transition-fast);
	}

	.card:hover {
		background-color: var(--color-surface-hover);
		border-color: var(--color-border-strong);
		box-shadow: var(--shadow-md);
	}

	.card:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: var(--glow-focus);
	}

	.card:active {
		transform: translateY(1px);
	}

	.card-body {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
		flex: 1;
		min-width: 0; /* allow text truncation */
	}

	.card-text {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
		flex: 1;
	}

	.card-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		letter-spacing: var(--tracking-snug);
		line-height: var(--line-height-snug);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin: 0;
	}

	.card-path {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		line-height: var(--line-height-snug);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin: 0;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-2xs);
		color: var(--color-text-muted);
		margin-top: var(--space-1);
		margin-bottom: 0;
	}

	.meta-label {
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-text-disabled);
	}

	.meta-value {
		color: var(--color-text-secondary);
	}

	/* --- Actions row (rename / delete) ---------------------------------- */
	.card-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		opacity: 0;
		transform: translateX(4px);
		transition:
			opacity var(--transition-fast),
			transform var(--transition-fast);
		flex-shrink: 0;
	}

	/* Reveal on hover OR when any descendant is focused (keyboard). */
	.card:hover .card-actions,
	.card:focus-within .card-actions {
		opacity: 1;
		transform: translateX(0);
	}

	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		background-color: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			background-color var(--transition-fast),
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.icon-button:hover {
		color: var(--color-text-primary);
		background-color: var(--color-surface-elevated);
		border-color: var(--color-border);
	}

	.icon-button:focus-visible {
		outline: none;
		color: var(--color-text-primary);
		border-color: var(--color-primary);
		box-shadow: var(--glow-focus);
		/* Keep actions visible if the user tabs straight to one. */
		opacity: 1;
	}

	.icon-button-danger:hover {
		color: var(--color-error);
		border-color: var(--color-error);
	}

	/* When actions are hidden, make sure they're also not tab-reachable
	   in a visually confusing way — but we keep them focusable because
	   :focus-within reveals them (see rule above). That's the intended UX:
	   Tab reaches them, which reveals them. No extra work needed. */
</style>
