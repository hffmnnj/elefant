import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';

/**
 * Elefant dark theme for CodeMirror 6.
 * Uses CSS custom properties to match the app's design system.
 * Designed for the diff viewer — optimized for reading diffs, not editing.
 */
export const elefantDarkTheme: Extension = EditorView.theme(
	{
		'&': {
			backgroundColor: 'var(--color-bg)',
			color: 'var(--color-text-primary)',
			fontSize: 'var(--font-size-sm)',
			fontFamily: 'var(--font-mono)',
		},
		'.cm-content': {
			padding: '8px 0',
		},
		'.cm-focused': {
			outline: 'none',
		},
		'.cm-gutters': {
			backgroundColor: 'var(--color-surface)',
			color: 'var(--color-text-disabled)',
			borderRight: '1px solid var(--color-border)',
		},
		'.cm-lineNumbers .cm-gutterElement': {
			minWidth: '3em',
			paddingRight: '8px',
		},
		'.cm-cursor': {
			borderLeftColor: 'var(--color-primary)',
		},
		'.cm-selectionBackground': {
			backgroundColor: 'var(--color-primary-subtle)',
		},
		'.cm-focused .cm-selectionBackground': {
			backgroundColor: 'var(--color-primary-subtle)',
		},
		// Diff-specific: added lines
		'.cm-changedLine': {
			backgroundColor: 'color-mix(in oklch, var(--color-success) 8%, transparent)',
		},
		'.cm-deletedLine, .cm-deletedChunk': {
			backgroundColor: 'color-mix(in oklch, var(--color-error) 8%, transparent)',
		},
		'.cm-insertedLine, .cm-changedText': {
			backgroundColor: 'color-mix(in oklch, var(--color-success) 15%, transparent)',
		},
		'.cm-deletedText': {
			backgroundColor: 'color-mix(in oklch, var(--color-error) 15%, transparent)',
		},
		// Merge view specific
		'.cm-mergeGap': {
			backgroundColor: 'var(--color-surface)',
			borderLeft: '1px solid var(--color-border)',
			borderRight: '1px solid var(--color-border)',
		},
		'.cm-mergeViewEditor:first-child': {
			borderRight: '1px solid var(--color-border)',
		},
	},
	{ dark: true }
);

/**
 * Elefant light theme for CodeMirror 6.
 */
export const elefantLightTheme: Extension = EditorView.theme(
	{
		'&': {
			backgroundColor: 'var(--color-bg)',
			color: 'var(--color-text-primary)',
			fontSize: 'var(--font-size-sm)',
			fontFamily: 'var(--font-mono)',
		},
		'.cm-content': {
			padding: '8px 0',
		},
		'.cm-focused': {
			outline: 'none',
		},
		'.cm-gutters': {
			backgroundColor: 'var(--color-surface)',
			color: 'var(--color-text-muted)',
			borderRight: '1px solid var(--color-border)',
		},
		'.cm-lineNumbers .cm-gutterElement': {
			minWidth: '3em',
			paddingRight: '8px',
		},
		'.cm-cursor': {
			borderLeftColor: 'var(--color-primary)',
		},
		'.cm-selectionBackground': {
			backgroundColor: 'var(--color-primary-subtle)',
		},
		'.cm-focused .cm-selectionBackground': {
			backgroundColor: 'var(--color-primary-subtle)',
		},
		// Diff-specific: added/removed lines
		'.cm-changedLine': {
			backgroundColor: 'color-mix(in oklch, var(--color-success) 10%, transparent)',
		},
		'.cm-deletedLine, .cm-deletedChunk': {
			backgroundColor: 'color-mix(in oklch, var(--color-error) 10%, transparent)',
		},
		'.cm-insertedLine, .cm-changedText': {
			backgroundColor: 'color-mix(in oklch, var(--color-success) 20%, transparent)',
		},
		'.cm-deletedText': {
			backgroundColor: 'color-mix(in oklch, var(--color-error) 20%, transparent)',
		},
		'.cm-mergeGap': {
			backgroundColor: 'var(--color-surface)',
			borderLeft: '1px solid var(--color-border)',
			borderRight: '1px solid var(--color-border)',
		},
		'.cm-mergeViewEditor:first-child': {
			borderRight: '1px solid var(--color-border)',
		},
	},
	{ dark: false }
);
