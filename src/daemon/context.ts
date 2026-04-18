/**
 * DaemonContext — shared state container for the Elefant daemon.
 *
 * This type is intentionally partial at this stage. Future waves will
 * expand it to include `state`, `plugins`, `permissions`, and `compaction`.
 */

import type { HookRegistry } from '../hooks/index.ts';
import type { ToolRegistry } from '../tools/registry.ts';
import type { ProviderRouter } from '../providers/router.ts';
import type { ProjectInfo } from '../project/types.ts';
import type { Database } from '../db/database.ts';
import type { ElefantConfig } from '../config/index.ts';

export interface DaemonContext {
  config: ElefantConfig;
  hooks: HookRegistry;
  tools: ToolRegistry;
  providers: ProviderRouter;
  project: ProjectInfo;
  db: Database;
}
