<script lang="ts">
	type Props = {
		onToggleSidebar?: () => void;
		children?: import("svelte").Snippet;
	};

	let { onToggleSidebar, children }: Props = $props();
</script>

<div class="topbar-content">
	<button
		class="sidebar-toggle"
		onclick={onToggleSidebar}
		aria-label="Toggle sidebar"
		title="Toggle sidebar"
	>
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
		>
			<line x1="2" y1="4" x2="14" y2="4" />
			<line x1="2" y1="8" x2="14" y2="8" />
			<line x1="2" y1="12" x2="14" y2="12" />
		</svg>
	</button>

	<div class="topbar-spacer"></div>

	{@render children?.()}
</div>

<style>
	.topbar-content {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
	}

	.sidebar-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			background-color var(--transition-fast);
	}

	.sidebar-toggle:hover {
		color: var(--color-text-primary);
		background-color: var(--color-surface-hover);
	}

	.topbar-spacer {
		flex: 1;
	}
</style>
