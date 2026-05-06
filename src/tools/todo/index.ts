/**
 * Todo tools — todowrite and todoread for task list management.
 */

import type { ToolDefinition } from '../../types/tools.js';
import type { ElefantError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { ok, err } from '../../types/result.js';
import { setTodos, getTodos, type Todo } from './store.js';
import { formatTodos } from './format.js';

export interface TodoWriteParams {
  todos: Todo[];
  conversationId?: string;
}

export interface TodoReadParams {
  conversationId?: string;
}

const VALID_STATUSES: Todo['status'][] = ['pending', 'in_progress', 'completed', 'cancelled'];
const VALID_PRIORITIES: Todo['priority'][] = ['high', 'medium', 'low'];

/**
 * Validate a single todo item.
 * Returns null if valid, error message if invalid.
 */
function validateTodo(todo: Todo): string | null {
  // Validate content
  if (typeof todo.content !== 'string' || todo.content.trim() === '') {
    return `Todo content must be a non-empty string`;
  }

  // Validate status
  if (!VALID_STATUSES.includes(todo.status)) {
    return `Invalid status: ${todo.status}`;
  }

  // Validate priority
  if (!VALID_PRIORITIES.includes(todo.priority)) {
    return `Invalid priority: ${todo.priority}`;
  }

  return null;
}

/**
 * todowrite tool — replace the full todo list for a conversation.
 */
export const todowriteTool: ToolDefinition<TodoWriteParams, string> = {
  name: 'todowrite',
  description: 'Create or replace the full task list for the current conversation. Use this to track progress on multi-step tasks.',
  parameters: {
    todos: {
      type: 'array',
      description: 'Array of todo items to store (replaces any existing list)',
      required: true,
    },
    conversationId: {
      type: 'string',
      description: 'Conversation identifier for isolated task lists (default: "default")',
      required: false,
    },
  },
  execute: async (params): Promise<Result<string, ElefantError>> => {
    const { todos, conversationId } = params;

    // Filter out items with empty or whitespace-only content rather than
    // erroring — models sometimes emit placeholder items with no content
    // set yet (e.g. when calling todowrite with 0-length task arrays or
    // items whose content field was not yet populated). Silently dropping
    // them produces a clean list instead of a hard validation failure.
    const validTodos = todos.filter(
      (todo) => typeof todo.content === 'string' && todo.content.trim() !== '',
    );

    // Validate remaining items for status/priority correctness
    for (const todo of validTodos) {
      const error = validateTodo(todo);
      if (error) {
        return err({
          code: 'VALIDATION_ERROR',
          message: error,
        });
      }
    }

    // Store the todos
    const key = conversationId ?? 'default';
    setTodos(key, validTodos);

    // Return formatted list (or explicit empty acknowledgement)
    if (validTodos.length === 0) {
      return ok('(no todos)');
    }
    return ok(formatTodos(validTodos));
  },
};

/**
 * todoread tool — read the current todo list for a conversation.
 */
export const todoreadTool: ToolDefinition<TodoReadParams, string> = {
  name: 'todoread',
  description: 'Read the current task list for the conversation. Returns formatted todos or "(no todos)" if no list exists.',
  parameters: {
    conversationId: {
      type: 'string',
      description: 'Conversation identifier for isolated task lists (default: "default")',
      required: false,
    },
  },
  execute: async (params): Promise<Result<string, ElefantError>> => {
    const { conversationId } = params;

    const key = conversationId ?? 'default';
    const todos = getTodos(key);

    if (todos.length === 0) {
      return ok('(no todos)');
    }

    return ok(formatTodos(todos));
  },
};
