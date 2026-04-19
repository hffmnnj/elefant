# Hooks

Elefant exposes a hook system that allows plugins to intercept and modify daemon behavior. Hooks are registered via the plugin API using `api.on(event, handler)`.

## Complete Hook Event List

| Event | Input | Output | Description |
|-------|-------|--------|-------------|
| `tool:before` | `{ toolName, args, conversationId }` | `void \| { cancel: true }` | Fires before a tool executes. Return `{ cancel: true }` to block. |
| `tool:after` | `{ toolName, args, result, durationMs, conversationId }` | `void` | Fires after a tool completes. |
| `message:before` | `{ messages, provider, model, runId?, sessionId?, projectId? }` | `void \| { cancel: true }` | Fires before sending messages to the provider. |
| `message:after` | `{ messages, provider, model, durationMs, runId?, sessionId?, projectId? }` | `void` | Fires after receiving provider response. |
| `stream:start` | `{ provider, model, conversationId }` | `void` | Fires when a streaming response starts. |
| `stream:end` | `{ provider, model, conversationId, totalTokens? }` | `void` | Fires when a streaming response ends. |
| `shutdown` | `{ reason: 'SIGTERM' \| 'SIGINT' \| 'manual' }` | `void` | Fires when the daemon is shutting down. |
| `permission:ask` | `{ tool, args, conversationId, sessionId?, projectId?, agent?, risk, classification?, status?, reason? }` | `{ classification?, status?, reason? }` | Fires when a tool requires permission. See veto semantics below. |
| `system:transform` | `{ messages, sessionId, conversationId, runId?, projectId?, state, budgets: { tokens } }` | `{ messages }` | Fires before each provider call to transform messages ephemerally. Not persisted to history. |
| `context:transform` | `{ system: string[], sessionId, phase? }` | `void` | Fires when building context blocks for injection. |

---

## `permission:ask` veto semantics

The `permission:ask` hook can return a veto decision through `status`:

- `status: 'deny'` → hard-blocks immediately (`source: 'hook'`) and skips the WebSocket approval prompt.
- `status: 'allow'` → auto-approves immediately (`source: 'hook'`) and skips the WebSocket approval prompt.
- `status: 'ask'` or no `status` → keeps the existing approval behavior (`approval:request` / `approval:response`) based on risk.

### Hook context

`permission:ask` handlers receive:

- `tool`
- `args`
- `conversationId`
- `sessionId?`
- `projectId?`
- `agent?`
- `risk`

Handlers may return partial output including:

- `classification?: 'low' | 'medium' | 'high'`
- `status?: 'allow' | 'ask' | 'deny'`
- `reason?: string`

When multiple hooks set `status`, the first non-`undefined` value in hook execution order wins.

### Resolution source

Permission decisions include `source`:

- `hook` → decision came from veto hook status.
- `user` → decision came from WebSocket approval response.
- `default` → decision came from built-in risk policy (e.g., low/medium auto-approve or no-WS high-risk deny).

### Plugin example: deny `bash` for planner agent

```ts
api.on('permission:ask', (ctx) => {
	if (ctx.tool === 'bash' && ctx.agent === 'planner') {
		return {
			status: 'deny',
			reason: 'Planner agent is not allowed to execute bash',
		}
	}

	return {}
})
```

---

## `system:transform` ephemeral context injection

The `system:transform` hook fires immediately before each provider call in `runAgentLoop`. It allows plugins to inject ephemeral system messages that are **not persisted** to the conversation history.

### Hook context

`system:transform` handlers receive:

- `messages: Message[]` — the full message array about to be sent
- `sessionId: string`
- `conversationId: string`
- `runId?: string`
- `projectId?: string`
- `state: unknown` — opaque state object
- `budgets: { tokens: number }` — token budget for injection

Handlers must return:

- `messages: Message[]` — the transformed message array

### Token budget enforcement

Transforms exceeding `budgets.tokens` are clamped from the end with a warning logged. Use the `createCompactionBlockTransform` preset from `src/compaction/blocks.ts` for budget-aware block injection.

### Plugin example: inject project context

```ts
api.on('system:transform', (ctx) => {
	const projectContext = buildProjectContext(ctx.projectId)
	const systemMessage = { role: 'system', content: projectContext }
	
	// Prepend to messages (respecting budget)
	return {
		messages: [systemMessage, ...ctx.messages],
	}
})
```

---

## Registering hooks from plugins

All hooks are available via the plugin API:

```ts
export default function myPlugin(api) {
	// Register any hook
	api.on('permission:ask', handler)
	api.on('system:transform', handler)
	api.on('tool:before', handler)
	
	// Return disposer on unload
	return () => {
		// Cleanup if needed
	}
}
```

Handlers can be async and should return `void`, `{ cancel: true }` for cancellable hooks, or partial context updates for transform hooks.
