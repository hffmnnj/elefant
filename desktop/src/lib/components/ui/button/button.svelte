<script lang="ts">
	import { Button as ButtonPrimitive } from "bits-ui";
	import { buttonVariants, type Props } from "./index.js";
	import { cn } from "$lib/utils.js";

	let {
		class: className = "",
		variant = "default",
		size = "default",
		children,
		...restProps
	}: Props & { children?: import("svelte").Snippet } = $props();
</script>

<ButtonPrimitive.Root
	class={cn(buttonVariants({ variant, size }), className)}
	{...restProps}
>
	{@render children?.()}
</ButtonPrimitive.Root>
