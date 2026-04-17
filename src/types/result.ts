/**
 * Result type — discriminated union for error handling.
 * Never throw in the tool layer; always return Result.
 */

import type { ElefantError } from './errors.js';

export type Result<T, E = ElefantError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

/**
 * Create a successful Result with the given data.
 */
export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

/**
 * Create a failed Result with the given error.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
