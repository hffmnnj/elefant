/**
 * tool_list — returns every tool currently registered in the ToolRegistry.
 *
 * Gives the model accurate, runtime-derived self-knowledge of available tools.
 * Solves the problem where the model says "I don't have a task/subagent tool"
 * even though one was registered, because the system prompt was written before
 * the tool existed and never updated.
 */

import type { ToolDefinition } from '../../types/tools.js';
import type { ElefantError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { ok } from '../../types/result.js';
import type { ToolRegistry } from '../registry.js';

export interface ToolListParams {
	filter?: string;
}

/**
 * Build a single readable entry for one tool.
 * Format:
 *   • tool_name — description
 *     params: param1 (type, required), param2 (type, optional)
 */
function formatTool(tool: ToolDefinition): string {
	const params = Object.entries(tool.parameters)
		.map(([name, def]) => {
			const req = def.required === false ? 'optional' : 'required';
			return `${name} (${def.type}, ${req})`;
		})
		.join(', ');

	const paramLine = params.length > 0 ? `\n    params: ${params}` : '';
	return `• ${tool.name} — ${tool.description}${paramLine}`;
}

/**
 * Factory — closes over the registry so the returned tool always reflects
 * the live set of registered tools, including any added by plugins.
 */
export function createToolListTool(registry: ToolRegistry): ToolDefinition<ToolListParams, string> {
	return {
		name: 'tool_list',
		description:
			'List all tools currently available to you at runtime, with their descriptions and parameter signatures. ' +
			'Use this whenever you are unsure what tools you have — it reflects the actual registered set, ' +
			'including tools added by plugins. Optionally filter by a substring of the tool name or description.',
		parameters: {
			filter: {
				type: 'string',
				description:
					'Optional substring to filter results. Only tools whose name or description contains this string (case-insensitive) are returned.',
				required: false,
			},
		},
		execute: async (params): Promise<Result<string, ElefantError>> => {
			const allTools = registry.getAll();

			const tools =
				params.filter && params.filter.trim().length > 0
					? allTools.filter((t) => {
							const needle = params.filter!.toLowerCase();
							return (
								t.name.toLowerCase().includes(needle) ||
								t.description.toLowerCase().includes(needle)
							);
					  })
					: allTools;

			if (tools.length === 0) {
				const msg =
					params.filter
						? `No tools match filter "${params.filter}". Run tool_list with no filter to see all tools.`
						: 'No tools are currently registered.';
				return ok(msg);
			}

			const header = params.filter
				? `Tools matching "${params.filter}" (${tools.length} of ${allTools.length}):\n`
				: `Available tools (${tools.length} total):\n`;

			const body = tools.map(formatTool).join('\n\n');

			return ok(header + body);
		},
	};
}
