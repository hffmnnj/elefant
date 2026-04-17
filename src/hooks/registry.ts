import type { Disposer, HookEventName, HookHandler } from './types.ts';
import { HOOK_EVENT_NAMES } from './types.ts';

type HandlerStore = {
	[E in HookEventName]: Array<HookHandler<E>>;
};

function createEmptyStore(): HandlerStore {
	return {
		'tool:before': [],
		'tool:after': [],
		'message:before': [],
		'message:after': [],
		'stream:start': [],
		'stream:end': [],
		shutdown: [],
	};
}

export class HookRegistry {
	private readonly handlers: HandlerStore;

	public constructor() {
		this.handlers = createEmptyStore();
	}

	public register<E extends HookEventName>(event: E, handler: HookHandler<E>): Disposer {
		const eventHandlers = this.handlers[event] as Array<HookHandler<E>>;
		eventHandlers.push(handler);

		let disposed = false;
		return () => {
			if (disposed) {
				return;
			}

			disposed = true;
			const index = eventHandlers.indexOf(handler);
			if (index !== -1) {
				eventHandlers.splice(index, 1);
			}
		};
	}

	public getHandlers<E extends HookEventName>(event: E): readonly HookHandler<E>[] {
		const eventHandlers = this.handlers[event] as Array<HookHandler<E>>;
		return [...eventHandlers];
	}

	public clear(): void {
		for (const event of HOOK_EVENT_NAMES) {
			this.handlers[event].length = 0;
		}
	}
}
