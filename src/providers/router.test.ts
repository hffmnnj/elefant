import { describe, expect, it } from 'bun:test'

import type { ElefantConfig } from '../config/schema.ts'
import { ProviderRouter } from './router.ts'
import { AnthropicAdapter } from './anthropic.ts'
import { OpenAIAdapter } from './openai.ts'

const TEST_CONFIG: ElefantConfig = {
	port: 1337,
	logLevel: 'info',
	defaultProvider: 'openai-primary',
	providers: [
		{
			name: 'openai-primary',
			baseURL: 'https://api.openai.com/v1',
			apiKey: 'sk-openai-test',
			model: 'gpt-4o-mini',
			format: 'openai',
		},
		{
			name: 'anthropic-fallback',
			baseURL: 'https://api.anthropic.com',
			apiKey: 'sk-ant-test',
			model: 'claude-3-7-sonnet-latest',
			format: 'anthropic',
		},
	],
}

describe('ProviderRouter', () => {
	it('selects the configured default provider when no override is supplied', () => {
		const router = new ProviderRouter(TEST_CONFIG)
		const result = router.getAdapter()

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.data).toBeInstanceOf(OpenAIAdapter)
			expect(result.data.name).toBe('openai-primary')
		}
	})

	it('returns named provider override when requested', () => {
		const router = new ProviderRouter(TEST_CONFIG)
		const result = router.getAdapter('anthropic-fallback')

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.data).toBeInstanceOf(AnthropicAdapter)
			expect(result.data.name).toBe('anthropic-fallback')
		}
	})

	it('returns typed error for unknown provider names', () => {
		const router = new ProviderRouter(TEST_CONFIG)
		const result = router.getAdapter('does-not-exist')

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error.code).toBe('CONFIG_INVALID')
			expect(result.error.message).toContain('Provider not configured')
		}
	})
})
