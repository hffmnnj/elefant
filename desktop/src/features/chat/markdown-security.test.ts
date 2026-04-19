// Integration-level guards for the MarkdownRenderer security contract.
//
// MarkdownRenderer composes three separately-tested pieces (the URL
// sanitizer, the streaming splitter, and `@humanspeak/svelte-markdown`
// with `buildUnsupportedHTML`). These tests pin the two seams we can
// reach from a Node test runner: the marked parser's token classifier
// (shared with the library) and our URL sanitizer. The Svelte library
// itself uses the `svelte` export condition, so we exercise its
// behaviour indirectly via marked here and via component integration
// tests in a browser test runner (future work).

import { describe, expect, it } from 'bun:test';
import { Lexer, type Token } from 'marked';
import { sanitizeUrl, BLOCKED_URL } from './url-sanitizer.js';

function tokenTypes(tokens: Token[]): string[] {
	return tokens.map((t) => t.type);
}

describe('raw HTML is classified as `html` tokens by the parser', () => {
	// MarkdownRenderer maps every `html` token to the library's
	// unsupported-placeholder component via `buildUnsupportedHTML`, so
	// as long as hostile HTML arrives as that token type the DOM only
	// ever sees inert escaped text. If a future parser change routed
	// these strings to `paragraph` / `text` tokens instead, the
	// placeholder mapping would miss them — these tests catch that.

	it('classifies inline <script> as an html token inside a paragraph', () => {
		const tokens = new Lexer().lex('Before <script>alert(1)</script> after');
		const paragraph = tokens.find((t) => t.type === 'paragraph');
		expect(paragraph).toBeDefined();
		const inline = (paragraph as Token & { tokens?: Token[] }).tokens ?? [];
		expect(tokenTypes(inline)).toContain('html');
	});

	it('classifies block-level <img onerror> as an html token', () => {
		const tokens = new Lexer().lex('<img src=x onerror="alert(1)">');
		const types = tokenTypes(tokens as Token[]);
		// marked either classifies it as a top-level `html` token or
		// wraps it in a paragraph whose inline tokens include `html`.
		if (types.includes('html')) return;
		const paragraph = tokens.find((t) => t.type === 'paragraph');
		const inline = (paragraph as Token & { tokens?: Token[] })?.tokens ?? [];
		expect(tokenTypes(inline)).toContain('html');
	});

	it('classifies iframe tags as html tokens', () => {
		const tokens = new Lexer().lex('<iframe src="javascript:alert(1)"></iframe>');
		expect(tokenTypes(tokens as Token[])).toContain('html');
	});
});

describe('URL sanitizer rejects the full hostile-protocol set', () => {
	// End-to-end spot checks of the sanitizer from the caller's
	// perspective. Fine-grained evasion cases live in
	// url-sanitizer.test.ts; here we assert the contract
	// MarkdownRenderer relies on: every hostile protocol becomes `#`.

	const hostile = [
		'javascript:alert(1)',
		'JAVASCRIPT:alert(1)',
		'javascript%3Aalert(1)',
		'\tjavascript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'tauri://localhost/x',
		'file:///etc/passwd',
		'vbscript:msgbox("xss")',
	];

	for (const url of hostile) {
		it(`blocks ${JSON.stringify(url)}`, () => {
			expect(sanitizeUrl(url)).toBe(BLOCKED_URL);
		});
	}

	const allowed = ['https://example.com', 'http://example.com', 'mailto:foo@bar.com'];
	for (const url of allowed) {
		it(`allows ${JSON.stringify(url)}`, () => {
			expect(sanitizeUrl(url)).toBe(url);
		});
	}
});
