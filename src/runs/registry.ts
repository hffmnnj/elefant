import type { QuestionEmitter } from '../tools/question/emitter.ts'

export interface RunEntry {
	controller: AbortController
	startedAt: Date
	questionEmitter: QuestionEmitter
	agentType: string
	title: string
}

export class RunRegistry {
	private readonly runs = new Map<string, RunEntry>()

	registerRun(runId: string, entry: RunEntry): void {
		this.runs.set(runId, entry)
	}

	getRun(runId: string): RunEntry | undefined {
		return this.runs.get(runId)
	}

	abortRun(runId: string): boolean {
		const entry = this.runs.get(runId)
		if (!entry) {
			return false
		}

		entry.controller.abort()
		this.forgetRun(runId)
		return true
	}

	forgetRun(runId: string): void {
		this.runs.delete(runId)
	}
}
