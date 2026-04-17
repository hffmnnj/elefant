<script lang="ts">
	import { onMount } from "svelte";
	import AppShell from "$lib/components/layout/AppShell.svelte";
	import TopBar from "$lib/components/layout/TopBar.svelte";
	import Sidebar from "$lib/components/layout/Sidebar.svelte";
	import { themeStore } from "$lib/stores/theme.svelte.js";
	import { navigationStore } from "$lib/stores/navigation.svelte.js";

	let sidebarCollapsed = $state(false);

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	onMount(async () => {
		await themeStore.init();
	});

	const currentView = $derived(navigationStore.current);
</script>

<AppShell bind:sidebarCollapsed>
	{#snippet sidebar()}
		<Sidebar collapsed={sidebarCollapsed} />
	{/snippet}

	{#snippet topbar()}
		<TopBar onToggleSidebar={toggleSidebar}>
			<div class="topbar-actions">
				<button
					onclick={() => themeStore.toggle()}
					class="theme-toggle"
					aria-label="Toggle theme"
					title="Toggle theme"
				>
					{themeStore.isDark ? "☀️" : "🌙"}
				</button>
			</div>
		</TopBar>
	{/snippet}

	<!-- Content area — views will be wired in subsequent waves -->
	<div class="content-placeholder">
		<div class="placeholder-inner">
			<div class="placeholder-icon">🐘</div>
			<h1 class="placeholder-title">Elefant</h1>
			<p class="placeholder-subtitle">
				Current view: {currentView}
			</p>
			<p class="placeholder-tagline">Code with memory.</p>
		</div>
	</div>
</AppShell>

<style>
	.topbar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}

	.theme-toggle {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		font-size: 16px;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		transition:
			color var(--transition-fast),
			background-color var(--transition-fast);
	}

	.theme-toggle:hover {
		color: var(--color-text-primary);
		background-color: var(--color-surface-hover);
	}

	.content-placeholder {
		padding: var(--space-6);
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-inner {
		text-align: center;
		color: var(--color-text-muted);
	}

	.placeholder-icon {
		font-size: 48px;
		margin-bottom: var(--space-4);
	}

	.placeholder-title {
		font-family: var(--font-sans);
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin-bottom: var(--space-2);
	}

	.placeholder-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
	}

	.placeholder-tagline {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}
</style>
