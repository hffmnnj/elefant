import type { Message } from '../types/providers.ts';
import type { ToolResult } from '../types/tools.ts';

export interface ToolBeforeContext {
	readonly toolName: string;
	readonly args: Readonly<Record<string, unknown>>;
	readonly conversationId: string;
}

export interface ToolAfterContext {
	readonly toolName: string;
	readonly args: Readonly<Record<string, unknown>>;
	readonly result: ToolResult;
	readonly durationMs: number;
	readonly conversationId: string;
}

export interface MessageBeforeContext {
	readonly messages: readonly Message[];
	readonly provider: string;
	readonly model: string;
}

export interface MessageAfterContext {
	readonly messages: readonly Message[];
	readonly provider: string;
	readonly model: string;
	readonly durationMs: number;
}

export interface StreamStartContext {
	readonly provider: string;
	readonly model: string;
	readonly conversationId: string;
}

export interface StreamEndContext {
	readonly provider: string;
	readonly model: string;
	readonly conversationId: string;
	readonly totalTokens?: number;
}

export interface ShutdownContext {
	readonly reason: 'SIGTERM' | 'SIGINT' | 'manual';
}

export interface HookContextMap {
	'tool:before': ToolBeforeContext;
	'tool:after': ToolAfterContext;
	'message:before': MessageBeforeContext;
	'message:after': MessageAfterContext;
	'stream:start': StreamStartContext;
	'stream:end': StreamEndContext;
	shutdown: ShutdownContext;
}

export type HookEventName = keyof HookContextMap;
export type HookHandler<E extends HookEventName> = (context: HookContextMap[E]) => Promise<void>;
export type Disposer = () => void;

export const HOOK_EVENT_NAMES: readonly HookEventName[] = [
	'tool:before',
	'tool:after',
	'message:before',
	'message:after',
	'stream:start',
	'stream:end',
	'shutdown',
];
