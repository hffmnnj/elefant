/**
 * Glob tool — pattern-based file discovery.
 * Returns matching file paths sorted by modification time (newest first).
 */

import type { ToolDefinition } from '../types/tools.js';
import type { ElefantError } from '../types/errors.js';
import type { Result } from '../types/result.js';
import { ok, err } from '../types/result.js';

export interface GlobParams {
  pattern: string;
  path?: string; // search root, defaults to project directory
}

export interface GlobToolDeps {
  projectPath: string;
}

/**
 * Get file modification time in milliseconds.
 */
async function getMtimeMs(filePath: string): Promise<number> {
  try {
    const file = Bun.file(filePath);
    const stats = await file.stat();
    return stats.mtimeMs ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Create a glob tool bound to a specific project directory.
 */
export function createGlobTool(deps: GlobToolDeps): ToolDefinition<GlobParams, string> {
  return {
    name: 'glob',
    description: 'Pattern-based file discovery. Results sorted by modification time (newest first).',
    parameters: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match files (e.g., "**/*.ts", "src/**/*.js")',
        required: true,
      },
      path: {
        type: 'string',
        description: 'Search root directory (default: project directory)',
        required: false,
      },
    },
    execute: async (params): Promise<Result<string, ElefantError>> => {
      const { pattern, path: rootPath = deps.projectPath } = params;

      try {
        // Use Bun's native Glob
        const glob = new Bun.Glob(pattern);
        const matches: string[] = [];

        // Scan for matches
        for await (const filePath of glob.scan({ cwd: rootPath, absolute: true })) {
          matches.push(filePath);
        }

        // Sort by modification time (newest first)
        const filesWithMtime = await Promise.all(
          matches.map(async (filePath) => ({
            path: filePath,
            mtime: await getMtimeMs(filePath),
          }))
        );

        filesWithMtime.sort((a, b) => b.mtime - a.mtime);

        // Return newline-separated paths
        const sortedPaths = filesWithMtime.map((f) => f.path);
        return ok(sortedPaths.join('\n'));
      } catch (error) {
        if (error instanceof Error) {
          // Check for invalid glob pattern errors
          if (error.message.includes('glob') || error.message.includes('pattern')) {
            return err({
              code: 'VALIDATION_ERROR',
              message: `Invalid glob pattern: ${error.message}`,
            });
          }
        }

        return err({
          code: 'TOOL_EXECUTION_FAILED',
          message: `Failed to execute glob: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  };
}

/**
 * Static glob tool — defaults to `process.cwd()` when no path is given.
 * Used by the static registry; per-run registries should use `createGlobTool`.
 */
export const globTool: ToolDefinition<GlobParams, string> = createGlobTool({ projectPath: process.cwd() });
