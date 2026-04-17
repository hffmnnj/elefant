import { emit, type HookRegistry } from '../hooks/index.ts'
import type { ProviderRouter } from '../providers/router.ts'
import type { StreamEvent } from '../providers/types.ts'
import type { ElefantError } from '../types/errors.ts'
import { type Message } from '../types/providers.ts'
import type { Result } from '../types/result.ts'
import type { ToolCall, ToolDefinition, ToolResult } from '../types/tools.ts'

export interface ToolExecutor {
	execute(name: string, args: unknown): Promise<Result<string, ElefantError>>
}

export interface AgentLoopOptions {
	messages: Message[]
	tools: ToolDefinition[]
	provider?: string
	maxIterations?: number
	signal?: AbortSignal
	hookRegistry: HookRegistry
}

function createToolResult(toolCallId: string, content: string, isError: boolean): ToolResult {
	return {
		toolCallId,
		content,
		isError,
	}
}

export async function* runAgentLoop(
	router: ProviderRouter,
	registry: ToolExecutor,
	options: AgentLoopOptions,
): AsyncGenerator<StreamEvent> {
	const messages = [...options.messages]
	let iterations = 0
	const maxIterations = options.maxIterations ?? 50

	while (iterations < maxIterations) {
		iterations += 1
		const messageStart = Date.now()

		await emit(options.hookRegistry, 'message:before', {
			messages,
			provider: options.provider ?? 'default',
			model: 'unknown',
		})

		const adapterResult = router.getAdapter(options.provider)
		if (!adapterResult.ok) {
			yield { type: 'error', error: adapterResult.error }
			return
		}

		const pendingToolCalls: ToolCall[] = []
		let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' = 'stop'
		let assistantText = ''

		for await (const event of adapterResult.data.sendMessage(messages, options.tools, {
			signal: options.signal,
			provider: options.provider,
		})) {
			if (event.type === 'tool_call_complete') {
				pendingToolCalls.push(event.toolCall)
				continue
			}

			if (event.type === 'text_delta') {
				assistantText += event.text
				yield event
				continue
			}

			if (event.type === 'done') {
				finishReason = event.finishReason
				if (event.finishReason !== 'tool_calls') {
					yield event
				}
				continue
			}

			if (event.type === 'error') {
				yield event
				return
			}

			yield event
		}

		await emit(options.hookRegistry, 'message:after', {
			messages,
			provider: options.provider ?? 'default',
			model: 'unknown',
			durationMs: Date.now() - messageStart,
		})

		if (pendingToolCalls.length === 0 || finishReason !== 'tool_calls') {
			return
		}

		messages.push({
			role: 'assistant',
			content: assistantText,
			toolCalls: pendingToolCalls,
		})

		for (const toolCall of pendingToolCalls) {
			yield { type: 'tool_call_complete', toolCall }

			const executeResult = await registry.execute(toolCall.name, toolCall.arguments)
			const toolResult = createToolResult(
				toolCall.id,
				executeResult.ok ? executeResult.data : executeResult.error.message,
				!executeResult.ok,
			)

			yield {
				type: 'tool_result',
				toolResult,
			}

			messages.push({
				role: 'tool',
				content: toolResult.content,
				toolCallId: toolResult.toolCallId,
			})
		}
	}

	yield {
		type: 'error',
		error: {
			code: 'TOOL_EXECUTION_FAILED',
			message: 'Max iterations reached',
		},
	}
}
