<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		sidebar?: Snippet;
		topbar?: Snippet;
		children?: Snippet;
		sidebarCollapsed?: boolean;
	};

	let {
		sidebar,
		topbar,
		children,
		sidebarCollapsed = $bindable(false),
	}: Props = $props();
</script>

<div class="app-shell" class:sidebar-collapsed={sidebarCollapsed}>
	<!-- Sidebar -->
	<aside class="sidebar" aria-label="Navigation sidebar">
		{@render sidebar?.()}
	</aside>

	<!-- Main area: topbar + content -->
	<div class="main-area">
		<header class="topbar" aria-label="Application toolbar">
			{@render topbar?.()}
		</header>
		<main class="content">
			{@render children?.()}
		</main>
	</div>
</div>

<style>
	.app-shell {
		display: grid;
		grid-template-columns: var(--sidebar-width) 1fr;
		grid-template-rows: 1fr;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
		background-color: var(--color-bg);
		color: var(--color-text-primary);
		transition: grid-template-columns var(--transition-base);
	}

	.app-shell.sidebar-collapsed {
		grid-template-columns: var(--sidebar-width-collapsed) 1fr;
	}

	.sidebar {
		grid-row: 1 / 2;
		grid-column: 1 / 2;
		display: flex;
		flex-direction: column;
		background-color: var(--color-surface);
		border-right: 1px solid var(--color-border);
		overflow: hidden;
		height: 100vh;
		position: relative;
		transition: width var(--transition-base);
	}

	.main-area {
		grid-row: 1 / 2;
		grid-column: 2 / 3;
		display: grid;
		grid-template-rows: var(--topbar-height) 1fr;
		overflow: hidden;
	}

	.topbar {
		grid-row: 1 / 2;
		display: flex;
		align-items: center;
		background-color: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		padding: 0 var(--space-4);
		gap: var(--space-3);
		height: var(--topbar-height);
	}

	.content {
		grid-row: 2 / 3;
		overflow-y: auto;
		overflow-x: hidden;
		background-color: var(--color-bg);
	}

	@media (max-width: 900px) {
		.app-shell {
			grid-template-columns: var(--sidebar-width-collapsed) 1fr;
		}
	}
</style>
