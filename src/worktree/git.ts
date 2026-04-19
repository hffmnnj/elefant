import { err, ok } from '../types/result.js'
import type { GitResult } from './types.js'

const DEFAULT_TIMEOUT_MS = 10_000

function mapGitExitCode(stderr: string): 'not_a_repo' | 'git_failed' {
	if (/not a git repository/i.test(stderr)) {
		return 'not_a_repo'
	}

	return 'git_failed'
}

export async function runGit(
	args: string[],
	opts: { cwd: string; timeoutMs?: number },
): Promise<GitResult<{ stdout: string; stderr: string }>> {
	if (!Bun.which('git')) {
		return err({
			code: 'git_unavailable',
			message: 'git executable is not available on PATH',
			stderr: '',
			exitCode: -1,
		})
	}

	const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
	const controller = new AbortController()
	let timedOut = false

	const timeout = setTimeout(() => {
		timedOut = true
		controller.abort('git-timeout')
	}, timeoutMs)

	try {
		const subprocess = Bun.spawn(['git', ...args], {
			cwd: opts.cwd,
			stdout: 'pipe',
			stderr: 'pipe',
			signal: controller.signal,
			env: {
				...process.env,
				GIT_TERMINAL_PROMPT: '0',
				GIT_ASKPASS: '',
			},
		})

		const [exitCode, stdout, stderr] = await Promise.all([
			subprocess.exited,
			new Response(subprocess.stdout).text(),
			new Response(subprocess.stderr).text(),
		])

		if (timedOut) {
			return err({
				code: 'git_unavailable',
				message: `git command timed out after ${timeoutMs}ms`,
				stderr,
				exitCode: -1,
			})
		}

		if (exitCode !== 0) {
			return err({
				code: mapGitExitCode(stderr),
				message: `git exited with non-zero status: ${exitCode}`,
				stderr,
				exitCode,
			})
		}

		return ok({ stdout, stderr })
	} catch (error) {
		if (timedOut) {
			return err({
				code: 'git_unavailable',
				message: `git command timed out after ${timeoutMs}ms`,
				stderr: '',
				exitCode: -1,
			})
		}

		const message = error instanceof Error ? error.message : String(error)
		return err({
			code: 'git_unavailable',
			message,
			stderr: message,
			exitCode: -1,
		})
	} finally {
		clearTimeout(timeout)
	}
}
