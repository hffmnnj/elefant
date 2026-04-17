<script lang="ts">
	import GeneralSettings from './GeneralSettings.svelte';
	import ProviderSettings from './ProviderSettings.svelte';
	import DaemonControlSection from './DaemonControlSection.svelte';

	type Section = 'general' | 'providers' | 'daemon';

	let activeSection = $state<Section>('general');

	const sections: Array<{ id: Section; label: string }> = [
		{ id: 'general', label: 'General' },
		{ id: 'providers', label: 'Providers' },
		{ id: 'daemon', label: 'Daemon' },
	];
</script>

<div class="settings-view">
	<div class="settings-header">
		<h2 class="settings-title">Settings</h2>
	</div>

	<div class="settings-layout">
		<nav class="settings-nav" aria-label="Settings sections">
			{#each sections as section}
				<button
					class="settings-nav-item"
					class:active={activeSection === section.id}
					onclick={() => (activeSection = section.id)}
					aria-current={activeSection === section.id ? 'page' : undefined}
				>
					{section.label}
				</button>
			{/each}
		</nav>

		<div class="settings-content">
			{#if activeSection === 'general'}
				<GeneralSettings />
			{:else if activeSection === 'providers'}
				<ProviderSettings />
			{:else if activeSection === 'daemon'}
				<DaemonControlSection />
			{/if}
		</div>
	</div>
</div>

<style>
	.settings-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: var(--color-bg);
	}

	.settings-header {
		padding: var(--space-5) var(--space-6);
		border-bottom: 1px solid var(--color-border);
		background-color: var(--color-surface);
		flex-shrink: 0;
	}

	.settings-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		letter-spacing: var(--tracking-snug);
	}

	.settings-layout {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.settings-nav {
		width: 180px;
		flex-shrink: 0;
		padding: var(--space-4) var(--space-3);
		border-right: 1px solid var(--color-border);
		background-color: var(--color-surface);
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}

	.settings-nav-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--space-2) var(--space-3);
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-text-secondary);
		font-family: var(--font-sans);
		font-size: var(--font-size-md);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			background-color var(--transition-fast);
	}

	.settings-nav-item:hover {
		color: var(--color-text-primary);
		background-color: var(--color-surface-hover);
	}

	.settings-nav-item.active {
		color: var(--color-primary);
		background-color: var(--color-primary-subtle);
		font-weight: var(--font-weight-medium);
	}

	.settings-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-6);
	}
</style>
