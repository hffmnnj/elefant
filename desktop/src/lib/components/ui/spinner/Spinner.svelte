<script lang="ts">
	type Size = 'sm' | 'md' | 'lg';
	type Props = {
		size?: Size;
		class?: string;
	};
	let { size = 'md', class: className = '' }: Props = $props();

	const sizes: Record<Size, { outer: string; border: string }> = {
		sm: { outer: '16px', border: '2px' },
		md: { outer: '24px', border: '2px' },
		lg: { outer: '36px', border: '3px' },
	};
</script>

<span
	class="spinner {className}"
	style="--s-outer: {sizes[size].outer}; --s-border: {sizes[size].border}"
	role="status"
	aria-label="Loading"
>
	<span class="sr-only">Loading...</span>
</span>

<style>
	.spinner {
		display: inline-block;
		width: var(--s-outer);
		height: var(--s-outer);
		border-radius: 50%;
		border: var(--s-border) solid var(--color-border-strong);
		border-top-color: var(--color-primary);
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
			border-top-color: var(--color-primary);
			opacity: 0.7;
		}
	}
</style>
