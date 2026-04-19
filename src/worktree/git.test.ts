import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { runGit } from './git.js'

let tempDir = ''
let whichSpy: { mockRestore: () => void } | null = null
let spawnSpy: { mockRestore: () => void } | null = null

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'elefant-worktree-git-'))
})

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true })
	whichSpy?.mockRestore()
	whichSpy = null
	spawnSpy?.mockRestore()
	spawnSpy = null
})

describe('runGit', () => {
	it('runs git commands and returns stdout/stderr', async () => {
		const result = await runGit(['--version'], { cwd: tempDir })
		expect(result.ok).toBe(true)
		if (!result.ok) return

		expect(result.data.stdout).toContain('git version')
		expect(result.data.stderr).toBe('')
	})

	it('returns structured error for non-zero exits', async () => {
		const result = await runGit(['definitely-not-a-real-git-subcommand'], {
			cwd: tempDir,
		})

		expect(result.ok).toBe(false)
		if (result.ok) return

		expect(result.error.code).toBe('git_failed')
		expect(result.error.exitCode).not.toBe(0)
		expect(result.error.stderr.length).toBeGreaterThan(0)
	})

	it('returns not_a_repo when command runs outside a git repository', async () => {
		const result = await runGit(['status', '--porcelain'], { cwd: tempDir })

		expect(result.ok).toBe(false)
		if (result.ok) return

		expect(result.error.code).toBe('not_a_repo')
	})

	it('returns git_unavailable when timeout is exceeded', async () => {
		spawnSpy = spyOn(Bun, 'spawn').mockImplementation(() => {
			const stdout = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(''))
					controller.close()
				},
			})
			const stderr = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(''))
					controller.close()
				},
			})

			return {
				exited: new Promise<number>((resolve) => {
					setTimeout(() => resolve(0), 80)
				}),
				stdout,
				stderr,
			} as unknown as ReturnType<typeof Bun.spawn>
		})

		const result = await runGit(['hash-object', '--stdin'], {
			cwd: tempDir,
			timeoutMs: 20,
		})

		expect(result.ok).toBe(false)
		if (result.ok) return

		expect(result.error.code).toBe('git_unavailable')
		expect(result.error.message).toContain('timed out')
	})

	it('returns git_unavailable when git is missing from PATH', async () => {
		whichSpy = spyOn(Bun, 'which').mockReturnValue(null)

		const result = await runGit(['--version'], { cwd: tempDir })

		expect(whichSpy).toHaveBeenCalledWith('git')
		expect(result.ok).toBe(false)
		if (result.ok) return

		expect(result.error.code).toBe('git_unavailable')
	})
})
