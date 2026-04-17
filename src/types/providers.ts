/**
 * Provider type stubs for LLM routing.
 * Wave 6 will fill these with full implementation details.
 */

import type { ToolCall } from './tools.js';

export type ProviderFormat = 'openai' | 'anthropic';

export interface ProviderConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  format: ProviderFormat;
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string; // for role: 'tool'
}
