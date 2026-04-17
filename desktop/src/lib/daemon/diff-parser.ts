/**
 * Diff detection and parsing utilities.
 *
 * The Elefant daemon's edit/write tools return file content as strings.
 * We detect file operation tool results and show them in the DiffViewer.
 */

/**
 * Tool names that produce file content as output.
 * These are candidates for diff view rendering.
 */
export const FILE_EDIT_TOOLS = new Set(['edit', 'write', 'Edit', 'Write']);

/**
 * Determine if a tool call should show a diff view.
 */
export function isFileEditTool(toolName: string): boolean {
	return FILE_EDIT_TOOLS.has(toolName);
}

/**
 * Try to parse a unified diff string into original and modified text.
 * Returns null if the content is not a unified diff.
 */
export function parseUnifiedDiff(diff: string): { original: string; modified: string } | null {
	if (!diff.includes('--- ') || !diff.includes('+++ ') || !diff.includes('@@ ')) {
		return null;
	}

	const lines = diff.split('\n');
	const originalLines: string[] = [];
	const modifiedLines: string[] = [];

	for (const line of lines) {
		if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('@@ ')) {
			continue; // Skip headers
		} else if (line.startsWith('-')) {
			originalLines.push(line.slice(1));
		} else if (line.startsWith('+')) {
			modifiedLines.push(line.slice(1));
		} else {
			// Context line (no prefix or space prefix) — appears in both
			const content = line.startsWith(' ') ? line.slice(1) : line;
			originalLines.push(content);
			modifiedLines.push(content);
		}
	}

	return {
		original: originalLines.join('\n'),
		modified: modifiedLines.join('\n'),
	};
}

/**
 * For file write operations, the "original" is empty (new file)
 * and "modified" is the content.
 */
export function wrapNewFileContent(content: string): { original: string; modified: string } {
	return { original: '', modified: content };
}

/**
 * Extract file path from tool arguments if available.
 */
export function extractFilePath(toolName: string, args: Record<string, unknown>): string | null {
	const pathArg = args.path ?? args.file_path ?? args.filename ?? args.filepath;
	return typeof pathArg === 'string' ? pathArg : null;
}
