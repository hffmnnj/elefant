<script lang="ts">
	// ProjectPickerView — the full-page view shown when no project is active.
	//
	// Renders:
	//   - Header with title + primary "Open New Folder" button
	//   - A responsive grid of ProjectCard tiles
	//   - A loading skeleton while projects are first fetching
	//   - A friendly empty state when there are no projects yet
	//
	// The folder-picker + fuzzy-search + rename/delete wiring lands in later
	// tasks (2.5 / 2.6). This file establishes the scaffolding and visual
	// language the follow-up tasks will build on.

	import { projectsStore } from '$lib/stores/projects.svelte.js';
	import type { Project } from '$lib/types/project.js';
	import {
		HugeiconsIcon,
		FolderAddIcon,
	} from '$lib/icons/index.js';
	import ProjectCard from './ProjectCard.svelte';

	// Kick off a load on mount if we haven't loaded yet. Using an $effect with
	// a guard keeps us idempotent across remounts (e.g. when the user clicks
	// back into the picker from the TopBar in later tasks).
	let hasTriggeredLoad = $state(false);

	$effect(() => {
		if (hasTriggeredLoad) return;
		hasTriggeredLoad = true;
		void projectsStore.loadProjects();
	});

	// Placeholder for Task 2.5. The real flow is:
	//   1. pickDirectory() from $lib/tauri/dialog.ts
	//   2. projectsStore.openProject(path)
	//   3. navigation transition
	function handleOpenNewFolder(): void {
		// Intentionally a stub — real wiring lands in W2.T5.
		console.info('[picker] Open New Folder — wiring arrives in W2.T5');
	}

	function handleSelect(project: Project): void {
		// Real navigation lands in W3.T5; for now, select via the store so
		// reactive consumers can already see the change in dev.
		void projectsStore.selectProject(project.id);
	}

	function handleRename(project: Project): void {
		// W2.T6 will replace this with the inline-rename UX.
		console.info('[picker] rename requested for', project.id);
	}

	function handleDelete(project: Project): void {
		// W2.T6 will replace this with the confirm-dialog flow.
		console.info('[picker] delete requested for', project.id);
	}

	// Derived convenience — avoids repeated access in the template.
	const projects = $derived(projectsStore.projects);
	const isLoading = $derived(projectsStore.isLoading);
	const lastError = $derived(projectsStore.lastError);
	const showSkeleton = $derived(isLoading && projects.length === 0);
	const showEmptyState = $derived(!isLoading && projects.length === 0);
</script>

<section class="picker" aria-labelledby="picker-title">
	<div class="picker-inner">
		<header class="picker-header">
			<div class="picker-heading">
				<p class="picker-eyebrow">Workspace</p>
				<h1 id="picker-title" class="picker-title">Choose a project</h1>
				<p class="picker-subtitle">
					Open a folder to start a project, or pick up where you left off.
				</p>
			</div>

			<button
				type="button"
				class="primary-button"
				onclick={handleOpenNewFolder}
			>
				<span class="primary-button-icon" aria-hidden="true">
					<HugeiconsIcon icon={FolderAddIcon} size={16} strokeWidth={1.8} />
				</span>
				Open New Folder
			</button>
		</header>

		{#if lastError}
			<div class="error-banner" role="alert">
				<span class="error-label">Error</span>
				<span class="error-message">{lastError}</span>
			</div>
		{/if}

		{#if showSkeleton}
			<div class="grid" aria-busy="true" aria-label="Loading projects">
				{#each Array.from({ length: 4 }) as _, i (i)}
					<div class="skeleton-card" aria-hidden="true">
						<div class="skeleton-avatar"></div>
						<div class="skeleton-lines">
							<div class="skeleton-line skeleton-line-title"></div>
							<div class="skeleton-line skeleton-line-path"></div>
							<div class="skeleton-line skeleton-line-meta"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if showEmptyState}
			<div class="empty" role="status">
				<div class="empty-illustration" aria-hidden="true">
					<HugeiconsIcon icon={FolderAddIcon} size={32} strokeWidth={1.2} />
				</div>
				<h2 class="empty-title">No projects yet</h2>
				<p class="empty-description">
					Open a folder to get started. Elefant will create a
					<code class="empty-code">.elefant/</code>
					directory inside it to keep your sessions and memory.
				</p>
				<button
					type="button"
					class="primary-button empty-cta"
					onclick={handleOpenNewFolder}
				>
					<span class="primary-button-icon" aria-hidden="true">
						<HugeiconsIcon icon={FolderAddIcon} size={16} strokeWidth={1.8} />
					</span>
					Open a folder
				</button>
			</div>
		{:else}
			<div
				class="grid"
				role="list"
				aria-label="Recent projects"
			>
				{#each projects as project (project.id)}
					<div role="listitem" class="grid-item">
						<ProjectCard
							{project}
							onSelect={handleSelect}
							onRename={handleRename}
							onDelete={handleDelete}
						/>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		height: 100%;
		overflow-y: auto;
		background-color: var(--color-bg);
		/* Soft ambient warmth behind the content. */
		background-image: radial-gradient(
			ellipse 800px 400px at 50% 0%,
			var(--color-primary-subtle),
			transparent 70%
		);
	}

	.picker-inner {
		width: 100%;
		max-width: 960px;
		padding: var(--space-10) var(--space-7) var(--space-9);
		display: flex;
		flex-direction: column;
		gap: var(--space-7);
	}

	.picker-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-5);
		flex-wrap: wrap;
	}

	.picker-heading {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}

	.picker-eyebrow {
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-primary);
		margin: 0;
	}

	.picker-title {
		font-size: var(--font-size-4xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		letter-spacing: var(--tracking-tight);
		line-height: var(--line-height-tight);
		margin: 0;
	}

	.picker-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-muted);
		line-height: var(--line-height-relaxed);
		margin: 0;
		max-width: 52ch;
	}

	/* --- Primary button --------------------------------------------------
	   Local button styles so we don't need to thread the shadcn Button
	   component here (and to stay consistent with other feature views). */
	.primary-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-5);
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-md);
		background-color: var(--color-primary);
		color: var(--color-primary-foreground);
		font-family: var(--font-sans);
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		letter-spacing: var(--tracking-snug);
		cursor: pointer;
		box-shadow: var(--glow-primary);
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast),
			box-shadow var(--transition-fast),
			transform var(--transition-fast);
		white-space: nowrap;
	}

	.primary-button:hover {
		background-color: var(--color-primary-hover);
		border-color: var(--color-primary-hover);
		box-shadow: var(--glow-primary-strong);
	}

	.primary-button:focus-visible {
		outline: none;
		box-shadow: var(--glow-focus), var(--glow-primary-strong);
	}

	.primary-button:active {
		transform: translateY(1px);
	}

	.primary-button-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* --- Error banner --------------------------------------------------- */
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		background-color: color-mix(in srgb, var(--color-error) 10%, transparent);
		color: var(--color-text-primary);
	}

	.error-label {
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-error);
		flex-shrink: 0;
	}

	.error-message {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	/* --- Grid ----------------------------------------------------------- */
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);
	}

	.grid-item {
		min-width: 0;
	}

	/* --- Skeleton ------------------------------------------------------- */
	.skeleton-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.skeleton-avatar {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-lg);
		background-color: var(--color-surface-hover);
		animation: pulse 1.6s ease-in-out infinite;
		flex-shrink: 0;
	}

	.skeleton-lines {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		flex: 1;
		padding-top: var(--space-1);
	}

	.skeleton-line {
		height: 10px;
		border-radius: var(--radius-sm);
		background-color: var(--color-surface-hover);
		animation: pulse 1.6s ease-in-out infinite;
	}

	.skeleton-line-title { width: 60%; height: 12px; }
	.skeleton-line-path  { width: 85%; }
	.skeleton-line-meta  { width: 35%; height: 8px; }

	@keyframes pulse {
		0%, 100% { opacity: 0.6; }
		50%      { opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-avatar,
		.skeleton-line {
			animation: none;
		}
	}

	/* --- Empty state ---------------------------------------------------- */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-3);
		padding: var(--space-10) var(--space-6);
		border: 1px dashed var(--color-border-strong);
		border-radius: var(--radius-xl);
		background-color: var(--color-surface);
	}

	.empty-illustration {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		border-radius: var(--radius-xl);
		background-color: var(--color-primary-subtle);
		color: var(--color-primary);
		margin-bottom: var(--space-2);
		box-shadow: var(--glow-ambient);
	}

	.empty-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		letter-spacing: var(--tracking-snug);
		margin: 0;
	}

	.empty-description {
		font-size: var(--font-size-md);
		color: var(--color-text-muted);
		line-height: var(--line-height-relaxed);
		margin: 0;
		max-width: 46ch;
	}

	.empty-code {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background-color: var(--color-surface-elevated);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}

	.empty-cta {
		margin-top: var(--space-4);
	}

	/* --- Responsive tweaks ---------------------------------------------- */
	@media (max-width: 640px) {
		.picker-inner {
			padding: var(--space-7) var(--space-4) var(--space-7);
			gap: var(--space-6);
		}

		.picker-title {
			font-size: var(--font-size-3xl);
		}

		.picker-header {
			flex-direction: column;
			align-items: stretch;
		}

		.primary-button {
			justify-content: center;
		}
	}
</style>
