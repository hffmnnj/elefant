import { describe, expect, it } from 'bun:test'

import { parsePorcelainStatus, parseWorktreeList } from './parse.js'

const FIXTURE_MAIN = `worktree /tmp/repo
HEAD 6f4a5c4c5a2c3f8d4dbf4960d9b7a6f083c9d2b0
branch refs/heads/main

`

const FIXTURE_DETACHED = `worktree /tmp/repo-detached
HEAD 1234567890abcdef1234567890abcdef12345678
detached

`

const FIXTURE_LOCKED = `worktree /tmp/repo-locked
HEAD ffffffffffffffffffffffffffffffffffffffff
branch refs/heads/feature/locked
locked maintenance-window

`

const FIXTURE_BARE_AND_PRUNABLE = `worktree /tmp/repo-bare
HEAD 1111111111111111111111111111111111111111
bare

worktree /tmp/repo-prunable
HEAD 2222222222222222222222222222222222222222
branch refs/heads/feature/prunable
prunable gitdir file points to non-existent location

`

describe('parseWorktreeList', () => {
	it('parses a normal branch worktree block', () => {
		const parsed = parseWorktreeList(FIXTURE_MAIN)
		expect(parsed).toHaveLength(1)
		expect(parsed[0]).toEqual({
			path: '/tmp/repo',
			head: '6f4a5c4c5a2c3f8d4dbf4960d9b7a6f083c9d2b0',
			branch: 'main',
			isDetached: false,
			isBare: false,
			isLocked: false,
			isPrunable: false,
			isDirty: false,
		})
	})

	it('parses detached, locked, bare, and prunable flags', () => {
		const parsed = parseWorktreeList(
			`${FIXTURE_DETACHED}${FIXTURE_LOCKED}${FIXTURE_BARE_AND_PRUNABLE}`,
		)

		expect(parsed).toHaveLength(4)

		expect(parsed[0].isDetached).toBe(true)
		expect(parsed[0].branch).toBeNull()

		expect(parsed[1].isLocked).toBe(true)
		expect(parsed[1].lockReason).toBe('maintenance-window')

		expect(parsed[2].isBare).toBe(true)
		expect(parsed[2].branch).toBeNull()

		expect(parsed[3].isPrunable).toBe(true)
		expect(parsed[3].branch).toBe('feature/prunable')
	})
})

describe('parsePorcelainStatus', () => {
	it('returns clean for empty porcelain output', () => {
		expect(parsePorcelainStatus('')).toEqual({ clean: true, fileCount: 0 })
		expect(parsePorcelainStatus('\n\n')).toEqual({ clean: true, fileCount: 0 })
	})

	it('counts changed files for non-empty porcelain output', () => {
		const output = ` M src/file.ts
?? src/new-file.ts
A  README.md
`

		expect(parsePorcelainStatus(output)).toEqual({ clean: false, fileCount: 3 })
	})
})
