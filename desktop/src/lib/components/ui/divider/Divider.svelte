<script lang="ts">
	type Props = {
		orientation?: 'horizontal' | 'vertical';
		label?: string;
		class?: string;
	};
	let { orientation = 'horizontal', label, class: className = '' }: Props = $props();
</script>

{#if label}
	<div class="structural-divider-labeled {className}" role="separator">
		<span class="mono-label">{label}</span>
	</div>
{:else if orientation === 'vertical'}
	<div class="divider-vertical {className}" role="separator" aria-orientation="vertical"></div>
{:else}
	<hr class="structural-divider {className}" />
{/if}

<style>
	.divider-vertical {
		width: 1px;
		height: 100%;
		background: var(--color-border);
		flex-shrink: 0;
	}

	hr.structural-divider {
		border: none;
		height: 1px;
		background: var(--color-border);
		margin: var(--space-4) 0;
	}
</style>
