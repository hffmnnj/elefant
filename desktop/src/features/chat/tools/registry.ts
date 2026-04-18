import type { Component } from 'svelte';
import type { ToolCardProps } from './types.js';

/** Map of tool name to Svelte component */
export const toolCardRegistry: Record<string, Component<ToolCardProps>> = {};

/** Resolve a component for the given tool name. Returns null if not registered. */
export function resolveToolCard(name: string): Component<ToolCardProps> | null {
	return toolCardRegistry[name] ?? null;
}
