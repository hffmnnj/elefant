<script lang="ts">
	/**
	 * AgentModelPicker — reusable, Quire-styled, searchable model picker for
	 * the Agent Profiles view.
	 *
	 * Reuses the chat composer's existing model store (`chatStore`) — it does
	 * NOT introduce a parallel fetcher. Models are eager-loaded at app mount
	 * by `App.svelte`, so opening this picker is effectively free.
	 *
	 * Surface tiers:
	 *   - Trigger button : .quire-sm
	 *   - Dropdown panel : .quire-md
	 *   - Provider header: .quire-sm chip (uppercase mono)
	 *   - Model row      : flat with --color-surface-hover on hover
	 *
	 * The picker emits selection via the `onChange` prop only — no DOM events,
	 * no two-way binding. Selecting "Inherit from default" calls onChange(null).
	 */

	import { chatStore, type ModelEntry } from '../chat/chat.svelte.js';
	import {
		HugeiconsIcon,
		SearchIcon,
		CheckIcon,
		ChevronDownIcon,
	} from '$lib/icons/index.js';

	// ── Props ────────────────────────────────────────────────────────────────

	type Props = {
		value: { provider: string; model: string } | null;
		onChange: (value: { provider: string; model: string } | null) => void;
		disabled?: boolean;
	};

	const { value, onChange, disabled = false }: Props = $props();

	// ── Local state ──────────────────────────────────────────────────────────

	let open = $state(false);
	let query = $state('');
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);
	let searchEl = $state<HTMLInputElement | null>(null);
	let focusedIndex = $state(-1);

	// ── Derived: grouping + filtering ────────────────────────────────────────

	type Group = { provider: string; models: ModelEntry[] };

	/** Stable list of provider groups, alphabetised by provider name. */
	const allGroups = $derived.by<Group[]>(() => {
		const map = new Map<string, ModelEntry[]>();
		for (const m of chatStore.availableModels) {
			const bucket = map.get(m.provider) ?? [];
			bucket.push(m);
			map.set(m.provider, bucket);
		}
		const out: Group[] = [];
		for (const [provider, models] of map) {
			out.push({
				provider,
				models: [...models].sort((a, b) =>
					(a.name || a.id).localeCompare(b.name || b.id),
				),
			});
		}
		out.sort((a, b) => a.provider.localeCompare(b.provider));
		return out;
	});

	const filteredGroups = $derived.by<Group[]>(() => {
		const q = query.trim().toLowerCase();
		if (!q) return allGroups;
		return allGroups
			.map((g) => ({
				provider: g.provider,
				models: g.models.filter(
					(m) =>
						m.name.toLowerCase().includes(q) ||
						m.id.toLowerCase().includes(q) ||
						g.provider.toLowerCase().includes(q),
				),
			}))
			.filter((g) => g.models.length > 0);
	});

	/** Flat list of selectable rows — drives keyboard navigation.
	 *  Index 0 is always the "Inherit from default" sentinel; model rows
	 *  follow in the order the groups render. */
	type FlatRow =
		| { kind: 'inherit' }
		| { kind: 'model'; entry: ModelEntry };

	const flatRows = $derived.by<FlatRow[]>(() => {
		const out: FlatRow[] = [{ kind: 'inherit' }];
		for (const g of filteredGroups) {
			for (const m of g.models) out.push({ kind: 'model', entry: m });
		}
		return out;
	});

	const isLoading = $derived(chatStore.modelsLoading);
	const hasModels = $derived(chatStore.availableModels.length > 0);

	const triggerLabel = $derived.by(() => {
		if (!value) return 'Inherit from default';
		// Prefer the registry's display name when we can match the value.
		const match = chatStore.availableModels.find(
			(m) => m.provider === value.provider && m.id === value.model,
		);
		return match?.name || match?.id || value.model;
	});

	const triggerIsMuted = $derived(value === null);

	// ── Open / close ─────────────────────────────────────────────────────────

	function openPanel(): void {
		if (disabled) return;
		open = true;
		query = '';
		focusedIndex = -1;
		requestAnimationFrame(() => searchEl?.focus());
	}

	function closePanel(returnFocus = true): void {
		if (!open) return;
		open = false;
		query = '';
		focusedIndex = -1;
		if (returnFocus) triggerEl?.focus();
	}

	function toggle(): void {
		if (open) closePanel();
		else openPanel();
	}

	function selectRow(row: FlatRow): void {
		if (row.kind === 'inherit') {
			onChange(null);
		} else {
			onChange({ provider: row.entry.provider, model: row.entry.id });
		}
		closePanel();
	}

	function isSelected(entry: ModelEntry): boolean {
		return (
			value !== null &&
			value.provider === entry.provider &&
			value.model === entry.id
		);
	}

	// ── Click outside ────────────────────────────────────────────────────────

	$effect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Node | null;
			if (!target) return;
			if (triggerEl?.contains(target) || panelEl?.contains(target)) return;
			closePanel(false);
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	});

	// ── Keyboard ─────────────────────────────────────────────────────────────

	function onTriggerKeydown(e: KeyboardEvent): void {
		if (disabled) return;
		if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openPanel();
		}
	}

	function onPanelKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			e.preventDefault();
			closePanel();
			return;
		}

		const total = flatRows.length;
		if (total === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusedIndex = (focusedIndex + 1) % total;
			scrollFocusedIntoView();
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusedIndex = (focusedIndex - 1 + total) % total;
			scrollFocusedIntoView();
			return;
		}
		if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
			e.preventDefault();
			const row = flatRows[focusedIndex];
			if (row) selectRow(row);
		}
	}

	function scrollFocusedIntoView(): void {
		requestAnimationFrame(() => {
			panelEl
				?.querySelector<HTMLElement>(`[data-idx="${focusedIndex}"]`)
				?.scrollIntoView({ block: 'nearest' });
		});
	}
</script>

<div class="picker">
	<button
		bind:this={triggerEl}
		type="button"
		class="trigger quire-sm"
		class:muted={triggerIsMuted}
		class:open
		{disabled}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="agent-model-picker-panel"
		onclick={toggle}
		onkeydown={onTriggerKeydown}
	>
		<span class="trigger-label">{triggerLabel}</span>
		<HugeiconsIcon
			icon={ChevronDownIcon}
			size={14}
			strokeWidth={2}
			class="trigger-chevron"
		/>
	</button>

	{#if open}
		<div
			bind:this={panelEl}
			id="agent-model-picker-panel"
			class="panel quire-md"
			role="listbox"
			aria-label="Select model"
			tabindex="-1"
			onkeydown={onPanelKeydown}
		>
			<div class="search">
				<HugeiconsIcon
					icon={SearchIcon}
					size={14}
					strokeWidth={2}
					class="search-icon"
				/>
				<input
					bind:this={searchEl}
					bind:value={query}
					type="text"
					placeholder="Search models or providers…"
					class="search-input"
					aria-label="Filter models"
					autocomplete="off"
					spellcheck="false"
				/>
			</div>

			<div class="list" role="presentation">
				{#if isLoading && !hasModels}
					<div class="empty">Loading models…</div>
				{:else if !hasModels}
					<div class="empty">No models configured</div>
				{:else}
					<!-- "Inherit from default" sentinel — always at index 0 -->
					{@const inheritFocused = focusedIndex === 0}
					<button
						type="button"
						class="row inherit"
						class:focused={inheritFocused}
						class:selected={value === null}
						role="option"
						aria-selected={value === null}
						data-idx="0"
						onclick={() => selectRow({ kind: 'inherit' })}
						onmouseenter={() => (focusedIndex = 0)}
					>
						<span class="row-label">Inherit from default</span>
						{#if value === null}
							<HugeiconsIcon
								icon={CheckIcon}
								size={14}
								strokeWidth={2}
								class="row-check"
							/>
						{/if}
					</button>

					{#if filteredGroups.length === 0}
						<div class="empty subdued">No models match "{query}"</div>
					{:else}
						{#each filteredGroups as group (group.provider)}
							<div class="group">
								<div class="group-header quire-sm">
									{group.provider}
								</div>
							<div class="group-rows">
								<!-- context-window hint: not available in current registry shape — add when ModelEntry exposes contextWindow field -->
								{#each group.models as entry (entry.provider + ':' + entry.id)}
										{@const idx = flatRows.findIndex(
											(r) =>
												r.kind === 'model' &&
												r.entry.provider === entry.provider &&
												r.entry.id === entry.id,
										)}
										{@const focused = idx >= 0 && focusedIndex === idx}
										{@const selected = isSelected(entry)}
										<button
											type="button"
											class="row"
											class:focused
											class:selected
											role="option"
											aria-selected={selected}
											data-idx={idx}
											onclick={() => selectRow({ kind: 'model', entry })}
											onmouseenter={() => (focusedIndex = idx)}
										>
											<span class="row-name">{entry.name || entry.id}</span>
											{#if entry.name && entry.name !== entry.id}
												<span class="row-id">{entry.id}</span>
											{/if}
											{#if selected}
												<HugeiconsIcon
													icon={CheckIcon}
													size={14}
													strokeWidth={2}
													class="row-check"
												/>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Container ────────────────────────────────────────────────────── */

	.picker {
		position: relative;
		display: block;
		width: 100%;
	}

	/* ── Trigger — looks like a form select ───────────────────────────── */

	.trigger {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		height: 36px;
		padding: 0 var(--space-3);
		/* Solid surface — matches other inputs on the card */
		background-color: var(--surface-leaf, #16162a);
		border: 1px solid var(--border-edge, rgba(255,255,255,0.10));
		border-radius: var(--radius-leaf, 6px);
		color: var(--text-prose);
		font-family: var(--font-body);
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
		transition:
			border-color var(--transition-fast, 120ms ease),
			background-color var(--transition-fast, 120ms ease);
	}

	.trigger:hover:not([disabled]) {
		border-color: var(--border-emphasis, rgba(255,255,255,0.22));
		background-color: color-mix(in srgb, var(--surface-leaf, #16162a) 85%, white 15%);
	}

	.trigger:focus-visible {
		outline: none;
		border-color: var(--color-primary, #4049e1);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #4049e1) 25%, transparent);
	}

	.trigger.open {
		border-color: var(--color-primary, #4049e1);
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.trigger[disabled] {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.trigger-label {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* "Inherit from default" is shown in muted italic */
	.trigger.muted .trigger-label {
		color: var(--text-muted);
		font-style: italic;
	}

	.trigger :global(.trigger-chevron) {
		flex: 0 0 auto;
		color: var(--text-muted);
		transition: transform var(--transition-fast, 120ms ease);
	}

	.trigger.open :global(.trigger-chevron) {
		transform: rotate(180deg);
		color: var(--color-primary, #4049e1);
	}

	/* ── Panel — solid, elevated dropdown ─────────────────────────────── */

	.panel {
		position: absolute;
		top: 100%; /* flush — trigger already has open border-radius removed */
		left: 0;
		right: 0;
		min-width: 100%;
		max-height: 340px;
		display: flex;
		flex-direction: column;
		/* Fully opaque dark surface — no transparency */
		background-color: var(--surface-leaf, #16162a);
		border: 1px solid var(--color-primary, #4049e1);
		border-top: 1px solid var(--border-hairline, rgba(255,255,255,0.06));
		border-bottom-left-radius: var(--radius-leaf, 6px);
		border-bottom-right-radius: var(--radius-leaf, 6px);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.55),
			0 2px 8px rgba(0, 0, 0, 0.35);
		z-index: 100;
		overflow: hidden;
	}

	/* ── Search bar ───────────────────────────────────────────────────── */

	.search {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border-hairline, rgba(255,255,255,0.06));
		flex-shrink: 0;
	}

	.search :global(.search-icon) {
		flex: 0 0 auto;
		color: var(--text-disabled);
	}

	.search-input {
		flex: 1 1 auto;
		min-width: 0;
		background: transparent;
		border: none;
		outline: none;
		color: var(--text-prose);
		font-family: var(--font-body);
		font-size: var(--font-size-sm);
		line-height: 1.4;
	}

	.search-input::placeholder {
		color: var(--text-disabled);
	}

	/* ── Scrollable list ──────────────────────────────────────────────── */

	.list {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-1) 0;
		/* Custom scrollbar */
		scrollbar-width: thin;
		scrollbar-color: var(--border-edge) transparent;
	}

	.empty {
		padding: var(--space-4) var(--space-3);
		font-family: var(--font-body);
		font-size: var(--font-size-sm);
		color: var(--text-disabled);
		text-align: center;
	}

	.empty.subdued { font-style: italic; }

	/* ── Provider group ───────────────────────────────────────────────── */

	.group {
		margin-top: var(--space-1);
	}

	.group + .group {
		margin-top: var(--space-2);
	}

	/* Plain muted label — no chip border, keeps the list light */
	.group-header {
		display: block;
		padding: var(--space-1) var(--space-3);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: var(--tracking-widest, 0.08em);
		text-transform: uppercase;
		color: var(--text-disabled);
		/* Override any quire-sm chip styling */
		background: none !important;
		border: none !important;
		box-shadow: none !important;
	}

	.group-rows {
		display: flex;
		flex-direction: column;
	}

	/* ── Option rows ──────────────────────────────────────────────────── */

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		min-height: 34px;
		padding: 0 var(--space-3);
		background: transparent;
		border: none;
		color: var(--text-prose);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
		transition: background-color var(--transition-fast, 120ms ease);
	}

	/* Solid hover — not transparent */
	.row:hover,
	.row.focused {
		background-color: rgba(255, 255, 255, 0.06);
	}

	.row.selected {
		background-color: color-mix(
			in srgb,
			var(--color-primary, #4049e1) 14%,
			transparent
		);
	}

	.row:focus-visible {
		outline: none;
		background-color: rgba(255, 255, 255, 0.08);
	}

	/* "Inherit from default" separator row */
	.row.inherit {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-hairline, rgba(255,255,255,0.06));
		margin-bottom: var(--space-1);
		padding-bottom: var(--space-1);
	}

	.row-label {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row-name {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-prose);
	}

	.row-id {
		flex: 0 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 16ch;
		font-size: var(--font-size-xs);
		color: var(--text-disabled);
	}

	.row :global(.row-check) {
		flex: 0 0 auto;
		color: var(--color-primary, #4049e1);
		margin-left: auto;
	}

	/* ── Reduced motion ───────────────────────────────────────────────── */

	@media (prefers-reduced-motion: reduce) {
		.trigger,
		.trigger :global(.trigger-chevron),
		.row {
			transition: none;
		}
	}
</style>
