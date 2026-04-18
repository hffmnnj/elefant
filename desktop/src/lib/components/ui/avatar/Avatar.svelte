<script lang="ts">
	type Size = 'sm' | 'md' | 'lg';
	type Props = {
		src?: string;
		alt?: string;
		initials?: string;
		size?: Size;
		class?: string;
	};
	let { src, alt = '', initials, size = 'md', class: className = '' }: Props = $props();

	const sizes: Record<Size, string> = { sm: '24px', md: '32px', lg: '40px' };
	const fontSizes: Record<Size, string> = { sm: 'var(--font-size-xs)', md: 'var(--font-size-sm)', lg: 'var(--font-size-md)' };

	let imgError = $state(false);

	const showImage = $derived(src && !imgError);
	const displayInitials = $derived(initials ?? (alt ? alt.slice(0, 2).toUpperCase() : '??'));
</script>

<span
	class="avatar {className}"
	style="--avatar-size: {sizes[size]}; --avatar-font: {fontSizes[size]}"
	aria-label={alt}
>
	{#if showImage}
		<img src={src} alt={alt} onerror={() => (imgError = true)} />
	{:else}
		<span class="avatar-initials">{displayInitials}</span>
	{/if}
</span>

<style>
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--avatar-size);
		height: var(--avatar-size);
		border-radius: var(--radius-full);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		font-family: var(--font-mono);
		font-size: var(--avatar-font);
		font-weight: var(--font-weight-semibold);
		color: var(--color-primary);
		letter-spacing: var(--tracking-wider);
	}
</style>
