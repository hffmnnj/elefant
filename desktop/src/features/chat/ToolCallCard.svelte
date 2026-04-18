<script lang="ts">
	import type { ToolCallDisplay } from './types.js';
	import { resolveToolCard } from './tools/registry.js';
	import GenericToolCard from './tools/GenericToolCard.svelte';

	type Props = {
		toolCall: ToolCallDisplay;
	};

	let { toolCall }: Props = $props();

	const MatchedCard = $derived(resolveToolCard(toolCall.name));
</script>

{#if MatchedCard}
	<MatchedCard {toolCall} />
{:else}
	<GenericToolCard {toolCall} />
{/if}
