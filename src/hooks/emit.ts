import type { HookContextMap, HookEventName } from './types.ts';
import type { HookRegistry } from './registry.ts';

export async function emit<E extends HookEventName>(
	registry: HookRegistry,
	event: E,
	context: HookContextMap[E],
): Promise<void> {
	const handlers = registry.getHandlers(event);

	for (const [index, handler] of handlers.entries()) {
		try {
			await handler(context);
		} catch (error) {
			console.error(`[hooks] error in handler ${index} for event "${event}"`, error);
		}
	}
}
