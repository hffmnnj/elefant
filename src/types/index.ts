/**
 * Core shared types for Elefant daemon.
 * Re-exports all type modules for convenient importing.
 */

// Result types
export type { Result } from './result.js';
export { ok, err } from './result.js';

// Error types
export type { ErrorCode, ElefantError } from './errors.js';

// Tool types
export type {
  ToolDefinition,
  ParameterDefinition,
  ToolCall,
  ToolResult,
} from './tools.js';

// Hook types
export {
  HOOK_EVENT_NAMES,
} from './hooks.js';
export type {
  Disposer,
  HookContextMap,
  HookEventName,
  HookHandler,
  MessageAfterContext,
  MessageBeforeContext,
  ShutdownContext,
  StreamEndContext,
  StreamStartContext,
  ToolAfterContext,
  ToolBeforeContext,
} from './hooks.js';

// Provider types
export type {
  ProviderFormat,
  ProviderConfig,
  MessageRole,
  Message,
  ProviderAdapter,
  SendMessageOptions,
  StreamDoneEvent,
  StreamErrorEvent,
  StreamEvent,
  TextDeltaEvent,
  ToolCallCompleteEvent,
  ToolCallDeltaEvent,
  ToolResultEvent,
  ToolCallStartEvent,
} from './providers.js';
