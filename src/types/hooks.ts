/**
 * Hook event types for the Elefant plugin system.
 * Stubs — Wave 2 will flesh these out with full context types.
 */

export type HookEventName =
  | 'tool:before'
  | 'tool:after'
  | 'message:before'
  | 'message:after'
  | 'stream:start'
  | 'stream:end'
  | 'shutdown';

export type HookHandler<T = unknown> = (context: T) => Promise<void>;
