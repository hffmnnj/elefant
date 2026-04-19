import type { PorcelainStatusSummary, WorktreeSummary } from './types.js'

function createEmptySummary(path: string): WorktreeSummary {
	return {
		path,
		head: '',
		branch: null,
		isDetached: false,
		isBare: false,
		isLocked: false,
		isPrunable: false,
		isDirty: false,
	}
}

export function parseWorktreeList(stdout: string): WorktreeSummary[] {
	const lines = stdout.split(/\r?\n/)
	const items: WorktreeSummary[] = []
	let current: WorktreeSummary | null = null

	const flush = (): void => {
		if (current !== null) {
			items.push(current)
			current = null
		}
	}

	for (const line of lines) {
		if (line.trim() === '') {
			flush()
			continue
		}

		if (line.startsWith('worktree ')) {
			flush()
			current = createEmptySummary(line.slice('worktree '.length))
			continue
		}

		if (!current) {
			continue
		}

		if (line.startsWith('HEAD ')) {
			current.head = line.slice('HEAD '.length)
			continue
		}

		if (line.startsWith('branch ')) {
			const ref = line.slice('branch '.length)
			current.branch = ref.startsWith('refs/heads/')
				? ref.slice('refs/heads/'.length)
				: ref
			current.isDetached = false
			continue
		}

		if (line === 'detached') {
			current.isDetached = true
			current.branch = null
			continue
		}

		if (line === 'bare') {
			current.isBare = true
			continue
		}

		if (line.startsWith('locked')) {
			current.isLocked = true
			const reason = line.slice('locked'.length).trim()
			if (reason.length > 0) {
				current.lockReason = reason
			}
			continue
		}

		if (line.startsWith('prunable')) {
			current.isPrunable = true
			continue
		}
	}

	flush()
	return items
}

export function parsePorcelainStatus(stdout: string): PorcelainStatusSummary {
	const nonEmptyLines = stdout
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter((line) => line.length > 0)

	return {
		clean: nonEmptyLines.length === 0,
		fileCount: nonEmptyLines.length,
	}
}
