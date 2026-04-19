import { describe, it, expect, beforeEach } from 'bun:test';
import { HookRegistry } from '../../hooks/index.ts';
import { createToolRegistry } from '../registry.ts';

describe('tool_list', () => {
	let registry: ReturnType<typeof createToolRegistry>;

	beforeEach(() => {
		registry = createToolRegistry(new HookRegistry());
	});

	it('is registered in the default tool registry', () => {
		const result = registry.get('tool_list');
		expect(result.ok).toBe(true);
	});

	it('returns all tools when called with no filter', async () => {
		const result = await registry.execute('tool_list', {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Should list itself
		expect(result.data).toContain('tool_list');
		// Should list other core tools
		expect(result.data).toContain('bash');
		expect(result.data).toContain('read');
		expect(result.data).toContain('todowrite');
		expect(result.data).toContain('question');
		// Header should show count
		expect(result.data).toMatch(/Available tools \(\d+ total\)/);
	});

	it('filters results by name substring (case-insensitive)', async () => {
		const result = await registry.execute('tool_list', { filter: 'todo' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data).toContain('todowrite');
		expect(result.data).toContain('todoread');
		expect(result.data).not.toContain('• bash');
		expect(result.data).toMatch(/matching "todo"/);
	});

	it('filters results by description substring', async () => {
		const result = await registry.execute('tool_list', { filter: 'task list' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// todowrite/todoread describe themselves as task list tools
		expect(result.data).toContain('todowrite');
	});

	it('returns a no-match message for unknown filter', async () => {
		const result = await registry.execute('tool_list', { filter: 'zzznomatch' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data).toContain('No tools match filter');
		expect(result.data).toContain('zzznomatch');
	});

	it('includes parameter signatures in output', async () => {
		const result = await registry.execute('tool_list', { filter: 'tool_list' });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data).toContain('params:');
		expect(result.data).toContain('filter');
		expect(result.data).toContain('optional');
	});

	it('reflects plugins that register tools after initial setup', async () => {
		// Simulate a plugin registering a tool post-startup
		const { ToolRegistry } = await import('../registry.ts');
		const hookRegistry = new HookRegistry();
		const reg = new ToolRegistry(hookRegistry);

		const { createToolListTool } = await import('./index.ts');
		reg.register(createToolListTool(reg));

		// Register a fake plugin tool after tool_list was created
		reg.register({
			name: 'plugin_fake',
			description: 'A fake plugin tool',
			parameters: {},
			execute: async () => ({ ok: true as const, data: 'ok' }),
		});

		const result = await reg.execute('tool_list', {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// tool_list should see the late-registered plugin tool
		expect(result.data).toContain('plugin_fake');
	});
});
