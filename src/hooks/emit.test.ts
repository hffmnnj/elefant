import { describe, expect, it, mock } from 'bun:test';

import { emit } from './emit.ts';
import { HookRegistry } from './registry.ts';

describe('emit', () => {
	it('handler errors do not prevent subsequent handlers from running', async () => {
		const registry = new HookRegistry();
		const calls: number[] = [];
		const errorSpy = mock(() => {});
		const originalConsoleError = console.error;
		console.error = errorSpy;

		registry.register('stream:end', async () => {
			calls.push(1);
		});
		registry.register('stream:end', async () => {
			calls.push(2);
			throw new Error('boom');
		});
		registry.register('stream:end', async () => {
			calls.push(3);
		});

		await emit(registry, 'stream:end', {
			provider: 'anthropic',
			model: 'claude-3.7-sonnet',
			conversationId: 'conv-3',
			totalTokens: 42,
		});

		console.error = originalConsoleError;

		expect(calls).toEqual([1, 2, 3]);
		expect(errorSpy).toHaveBeenCalledTimes(1);
	});

	it('all handlers run even when a middle handler throws', async () => {
		const registry = new HookRegistry();
		const callOrder: string[] = [];

		registry.register('shutdown', async () => {
			callOrder.push('first');
		});
		registry.register('shutdown', async () => {
			callOrder.push('middle');
			throw new Error('expected failure');
		});
		registry.register('shutdown', async () => {
			callOrder.push('last');
		});

		await emit(registry, 'shutdown', {
			reason: 'manual',
		});

		expect(callOrder).toEqual(['first', 'middle', 'last']);
	});

	it('awaits async handlers sequentially', async () => {
		const registry = new HookRegistry();
		let firstCompleted = false;

		registry.register('message:before', async () => {
			await Bun.sleep(20);
			firstCompleted = true;
		});

		registry.register('message:before', async () => {
			expect(firstCompleted).toBe(true);
		});

		await emit(registry, 'message:before', {
			messages: [
				{
					role: 'user',
					content: 'Run the command',
				},
			],
			provider: 'openai',
			model: 'gpt-4.1',
		});
	});

	it('passes typed context to each handler', async () => {
		const registry = new HookRegistry();
		const seenConversationIds: string[] = [];

		registry.register('tool:after', async (context) => {
			seenConversationIds.push(context.conversationId);
			expect(context.toolName).toBe('glob');
			expect(context.result.isError).toBe(false);
		});

		registry.register('tool:after', async (context) => {
			seenConversationIds.push(context.conversationId);
			expect(context.durationMs).toBe(8);
			expect(context.args.pattern).toBe('src/**/*.ts');
		});

		await emit(registry, 'tool:after', {
			toolName: 'glob',
			args: { pattern: 'src/**/*.ts' },
			result: {
				toolCallId: 'call-1',
				content: '[]',
				isError: false,
			},
			durationMs: 8,
			conversationId: 'conv-4',
		});

		expect(seenConversationIds).toEqual(['conv-4', 'conv-4']);
	});
});
