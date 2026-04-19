import type { RunContext, AgentRunEventEnvelope } from './types.ts'

interface SsePublisher {
	publish(projectId: string, sessionId: string, eventType: string, data: unknown): void
}

const runEventSequences = new Map<string, number>()

function nextSequence(runId: string): number {
	const current = runEventSequences.get(runId) ?? 0
	const next = current + 1
	runEventSequences.set(runId, next)
	return next
}

export function publishRunEvent(
	runCtx: RunContext,
	sseManager: SsePublisher,
	type: string,
	data: unknown,
): AgentRunEventEnvelope {
	const envelope: AgentRunEventEnvelope = {
		ts: new Date().toISOString(),
		projectId: runCtx.projectId,
		sessionId: runCtx.sessionId,
		runId: runCtx.runId,
		parentRunId: runCtx.parentRunId ?? null,
		agentType: runCtx.agentType,
		title: runCtx.title,
		seq: nextSequence(runCtx.runId),
		type,
		data,
	}

	sseManager.publish(runCtx.projectId, runCtx.sessionId, type, envelope)
	return envelope
}

export function clearRunEventSequence(runId: string): void {
	runEventSequences.delete(runId)
}
