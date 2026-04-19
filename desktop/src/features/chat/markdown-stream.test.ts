// Tests for the streaming-safe fence splitter used by MarkdownRenderer.
//
// These assertions encode the contract that the renderer depends on:
//   • closed fences are left inside the markdown body
//   • an open fence (odd count) causes the tail to be split off as a
//     plain-text preview so the library never sees a malformed block
//   • simulated streaming tokens flip between "open" and "closed" states
//     exactly at the character that contains the closing backticks
//
// The renderer wraps this function with a requestAnimationFrame throttle,
// but the throttle is trivial scheduling code; all the interesting logic
// lives here and is directly testable.

import { describe, expect, it } from 'bun:test';
import { splitAtOpenFence } from './markdown-stream.js';

describe('splitAtOpenFence — no fences', () => {
	it('handles empty input', () => {
		expect(splitAtOpenFence('')).toEqual({ markdown: '', streamingFence: null });
	});

	it('passes through pure prose', () => {
		const src = '# Hello\n\nSome **bold** text.\n';
		expect(splitAtOpenFence(src)).toEqual({ markdown: src, streamingFence: null });
	});

	it('ignores inline backticks', () => {
		const src = 'Use `foo()` and `bar()` together.';
		expect(splitAtOpenFence(src)).toEqual({ markdown: src, streamingFence: null });
	});

	it('ignores mid-line triple backticks that are not at column 0', () => {
		// Not a valid CommonMark fence — the parser would treat it as inline.
		const src = 'prose ``` not a fence ``` more prose';
		expect(splitAtOpenFence(src)).toEqual({ markdown: src, streamingFence: null });
	});
});

describe('splitAtOpenFence — closed fences', () => {
	it('leaves a single closed fence inside the markdown body', () => {
		const src = 'Before\n\n```ts\nconst x = 1;\n```\n\nAfter';
		expect(splitAtOpenFence(src)).toEqual({ markdown: src, streamingFence: null });
	});

	it('leaves multiple closed fences in the body', () => {
		const src = '```ts\na\n```\n\n```py\nb\n```\n';
		expect(splitAtOpenFence(src)).toEqual({ markdown: src, streamingFence: null });
	});
});

describe('splitAtOpenFence — open fences', () => {
	it('splits at an open fence at the start of a streaming message', () => {
		const src = 'Intro line\n```ts\nconst x =';
		const result = splitAtOpenFence(src);
		expect(result.markdown).toBe('Intro line\n');
		expect(result.streamingFence).toBe('const x =');
	});

	it('drops the info string on the fence opening line', () => {
		const src = '```python\nprint("hi")';
		const result = splitAtOpenFence(src);
		expect(result.markdown).toBe('');
		// The `python` info string is not part of the code body; CodeBlock
		// will render it from the lang prop when the fence eventually closes.
		expect(result.streamingFence).toBe('print("hi")');
	});

	it('handles a fence with no info string', () => {
		const src = '```\nplain text\n';
		const result = splitAtOpenFence(src);
		expect(result.markdown).toBe('');
		expect(result.streamingFence).toBe('plain text\n');
	});

	it('handles a fence where only the opening ``` has arrived', () => {
		// Three backticks but no newline yet: the body is empty.
		const src = '```';
		const result = splitAtOpenFence(src);
		expect(result.markdown).toBe('');
		expect(result.streamingFence).toBe('');
	});

	it('handles a fence where only part of the info string has arrived', () => {
		const src = 'Plain\n```ts';
		const result = splitAtOpenFence(src);
		expect(result.markdown).toBe('Plain\n');
		expect(result.streamingFence).toBe('');
	});

	it('treats the second fence as open when one is closed and another begins', () => {
		const src = '```ts\nconst x = 1;\n```\n\nAnd now:\n```py\nprint(';
		const result = splitAtOpenFence(src);
		expect(result.markdown).toBe('```ts\nconst x = 1;\n```\n\nAnd now:\n');
		expect(result.streamingFence).toBe('print(');
	});
});

describe('splitAtOpenFence — simulated streaming', () => {
	// Re-runs the splitter after each character as if SSE were
	// delivering a full code block one byte at a time. The tests below
	// capture the exact transition points where the renderer should
	// flip between "open fence preview" and "full markdown".
	function stream(source: string): Array<ReturnType<typeof splitAtOpenFence>> {
		const out: Array<ReturnType<typeof splitAtOpenFence>> = [];
		for (let i = 1; i <= source.length; i++) {
			out.push(splitAtOpenFence(source.slice(0, i)));
		}
		return out;
	}

	it('stays closed until the first fence opens, then open until it closes', () => {
		const source = 'Hi\n```ts\nconst x = 1;\n```\n';
		const states = stream(source);

		// Initial characters: plain prose, everything is markdown.
		expect(states[0]!.streamingFence).toBeNull();
		expect(states[2]!.streamingFence).toBeNull();

		// After the third backtick arrives on a fresh line, the fence is
		// open. The exact index is 3 (H,i,\n) + 3 backticks = 6.
		const afterOpen = splitAtOpenFence(source.slice(0, 6));
		expect(afterOpen.streamingFence).toBe('');

		// While the body is arriving, the tail is a non-null string.
		const midBody = splitAtOpenFence(source.slice(0, 16));
		expect(midBody.streamingFence).not.toBeNull();
		expect(midBody.markdown).toBe('Hi\n');

		// After the closing ``` arrives, the fence is fully closed.
		const closedIdx = source.indexOf('```\n', 6) + 3;
		const afterClose = splitAtOpenFence(source.slice(0, closedIdx));
		expect(afterClose.streamingFence).toBeNull();
		expect(afterClose.markdown).toBe(source.slice(0, closedIdx));
	});

	it('flips open → closed at the exact character that completes the third closing backtick', () => {
		const source = '```ts\nconst x = 1;\n```';
		const penultimate = splitAtOpenFence(source.slice(0, source.length - 1));
		const final = splitAtOpenFence(source);

		// With two of three closing backticks, the fence is still open.
		expect(penultimate.streamingFence).not.toBeNull();
		// With all three, it closes — but the closing fence needs to
		// start at the beginning of a line, and the preceding char must
		// be a newline. Here the closing ``` follows "\n```" so it is a
		// valid CommonMark fence.
		expect(final.streamingFence).toBeNull();
		expect(final.markdown).toBe(source);
	});
});
