import type { ElefantConfig } from '../config/schema.ts'
import type { ElefantError } from '../types/errors.ts'
import type { Result } from '../types/result.ts'
import { err, ok } from '../types/result.ts'
import type { ProviderAdapter } from './types.ts'
import { AnthropicAdapter } from './anthropic.ts'
import { OpenAIAdapter } from './openai.ts'

export class ProviderRouter {
	private readonly adapters: Map<string, ProviderAdapter>
	private readonly defaultProvider: string

	constructor(config: ElefantConfig) {
		this.adapters = new Map<string, ProviderAdapter>()
		this.defaultProvider = config.defaultProvider

		for (const provider of config.providers) {
			if (this.adapters.has(provider.name)) {
				throw new Error(`Duplicate provider name in config: ${provider.name}`)
			}

			if (provider.format === 'openai') {
				this.adapters.set(provider.name, new OpenAIAdapter(provider))
				continue
			}

			if (provider.format === 'anthropic') {
				this.adapters.set(provider.name, new AnthropicAdapter(provider))
				continue
			}

			throw new Error(`Unsupported provider format: ${provider.format}`)
		}

		if (!this.adapters.has(this.defaultProvider)) {
			throw new Error(`Default provider not found: ${this.defaultProvider}`)
		}
	}

	public getAdapter(name?: string): Result<ProviderAdapter, ElefantError> {
		const selectedProvider = name ?? this.defaultProvider
		const adapter = this.adapters.get(selectedProvider)

		if (!adapter) {
			return err({
				code: 'CONFIG_INVALID',
				message: `Provider not configured: ${selectedProvider}`,
				details: {
					requestedProvider: selectedProvider,
					availableProviders: this.listProviders(),
				},
			})
		}

		return ok(adapter)
	}

	public listProviders(): string[] {
		return Array.from(this.adapters.keys())
	}
}
