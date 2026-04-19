import { describe, expect, it } from 'bun:test'

import { RunRegistry } from './registry.ts'

describe('RunRegistry', () => {
	it('handles register, abort, and forget lifecycle', () => {
		const registry = new RunRegistry()
		const runId = crypto.randomUUID()

		const controller = new AbortController()
		let observedAbort = false
		controller.signal.addEventListener('abort', () => {
			observedAbort = true
		})

		registry.registerRun(runId, {
			controller,
			startedAt: new Date(),
			questionEmitter: () => undefined,
			agentType: 'executor',
			title: 'Registry lifecycle',
		})

		expect(registry.getRun(runId)).toBeDefined()

		const abortResult = registry.abortRun(runId)
		expect(abortResult).toBe(true)
		expect(observedAbort).toBe(true)
		expect(registry.getRun(runId)).toBeUndefined()

		const missingAbort = registry.abortRun('does-not-exist')
		expect(missingAbort).toBe(false)

		registry.registerRun(runId, {
			controller: new AbortController(),
			startedAt: new Date(),
			questionEmitter: () => undefined,
			agentType: 'executor',
			title: 'Forget me',
		})
		expect(registry.getRun(runId)).toBeDefined()

		registry.forgetRun(runId)
		expect(registry.getRun(runId)).toBeUndefined()
	})
})
