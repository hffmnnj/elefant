<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { MergeView } from '@codemirror/merge';
	import { EditorView } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { elefantDarkTheme, elefantLightTheme } from '$lib/codemirror/theme.js';
	import { themeStore } from '$lib/stores/theme.svelte.js';

	type Props = {
		original: string;
		modified: string;
		mode?: 'unified' | 'split';
		language?: string;
		class?: string;
	};

	let {
		original,
		modified,
		mode = 'unified',
		language = 'text',
		class: className = '',
	}: Props = $props();

	let containerEl: HTMLDivElement;
	let mergeView: MergeView | null = null;

	function getLanguageExtension(lang: string) {
		switch (lang.toLowerCase()) {
			case 'typescript':
			case 'ts':
			case 'javascript':
			case 'js':
				// Lazy import to avoid bundling all languages
				return null; // Will be handled below
			default:
				return null;
		}
	}

	async function initMergeView(): Promise<void> {
		if (!containerEl) return;

		const theme = themeStore.isDark ? elefantDarkTheme : elefantLightTheme;

		// Destroy any existing view
		if (mergeView) {
			mergeView.destroy();
			mergeView = null;
		}

		// Clear container
		containerEl.innerHTML = '';

		const extensions = [theme, EditorView.editable.of(false)];

		mergeView = new MergeView({
			a: {
				doc: original,
				extensions,
			},
			b: {
				doc: modified,
				extensions,
			},
			parent: containerEl,
			orientation: mode === 'split' ? 'a-b' : undefined,
			collapseUnchanged: mode === 'unified' ? { margin: 3, minSize: 4 } : undefined,
			highlightChanges: true,
			gutter: true,
		});
	}

	onMount(() => {
		void initMergeView();
	});

	onDestroy(() => {
		if (mergeView) {
			mergeView.destroy();
			mergeView = null;
		}
	});

	// Re-init when theme changes
	$effect(() => {
		const isDark = themeStore.isDark;
		if (mergeView && containerEl) {
			void initMergeView();
		}
	});

	// Re-init when content or mode changes
	$effect(() => {
		const orig = original;
		const mod = modified;
		const m = mode;
		if (mergeView && containerEl) {
			void initMergeView();
		}
	});
</script>

<div
	class="diff-viewer {className}"
	bind:this={containerEl}
	role="region"
	aria-label="File diff viewer"
></div>

<style>
	.diff-viewer {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		max-height: 400px;
		overflow-y: auto;
	}

	/* CodeMirror reset — ensure CM6 fills container */
	.diff-viewer :global(.cm-editor) {
		height: auto;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
	}

	.diff-viewer :global(.cm-mergeView) {
		width: 100%;
	}

	.diff-viewer :global(.cm-mergeViewEditor) {
		flex: 1;
		min-width: 0;
	}
</style>
