import { afterEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { Database } from '../db/database.ts'
import { mountWorktreeRoutes } from './routes.ts'

const tempDirs: string[] = []

function createTempDir(prefix: string): string {
	const dir = mkdtempSync(join(tmpdir(), prefix))
	tempDirs.push(dir)
	return dir
}

async function runRawGit(args: string[], cwd: string): Promise<void> {
	const process = Bun.spawn(['git', ...args], {
		cwd,
		stdout: 'pipe',
		stderr: 'pipe',
	})

	const [exitCode, stderr] = await Promise.all([
		process.exited,
		new Response(process.stderr).text(),
	])

	if (exitCode !== 0) {
		throw new Error(`git ${args.join(' ')} failed: ${stderr}`)
	}
}

async function createSeedRepo(baseDir: string): Promise<string> {
	const repoPath = join(baseDir, 'repo')
	await runRawGit(['init', repoPath], baseDir)
	await Bun.write(join(repoPath, 'README.md'), '# integration\n')
	await runRawGit(['add', 'README.md'], repoPath)
	await runRawGit(
		[
			'-c',
			'user.email=elefant@example.com',
			'-c',
			'user.name=Elefant Test',
			'commit',
			'-m',
			'initial commit',
		],
		repoPath,
	)
	return repoPath
}

function jsonRequest(url: string, method: string, body?: unknown): Request {
	return new Request(url, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body !== undefined ? JSON.stringify(body) : undefined,
	})
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true })
	}
})

describe('worktree route integration', () => {
	it('supports create -> list -> delete -> prune over HTTP', async () => {
		const baseDir = createTempDir('elefant-worktree-int-')
		const dbPath = join(baseDir, 'db.sqlite')
		const projectPath = await createSeedRepo(baseDir)
		const targetPath = join(baseDir, 'repo-feature')

		const database = new Database(dbPath)
		const projectId = crypto.randomUUID()
		database.db.run(
			'INSERT INTO projects (id, name, path, description) VALUES (?, ?, ?, ?)',
			[projectId, 'Worktree Project', projectPath, null],
		)

		const app = new Elysia()
		mountWorktreeRoutes(app, { db: database })

		const createResponse = await app.handle(
			jsonRequest(`http://localhost/api/projects/${projectId}/worktrees`, 'POST', {
				targetPath,
				branch: 'feature/integration-worktree',
			}),
		)

		expect(createResponse.status).toBe(201)
		const createPayload = (await createResponse.json()) as {
			ok: boolean
			data: { path: string }
		}
		expect(createPayload.ok).toBe(true)
		expect(createPayload.data.path).toBe(targetPath)

		const listResponse = await app.handle(
			new Request(`http://localhost/api/projects/${projectId}/worktrees`),
		)
		expect(listResponse.status).toBe(200)
		const listPayload = (await listResponse.json()) as {
			ok: boolean
			data: Array<{ path: string }>
		}
		expect(listPayload.ok).toBe(true)
		expect(listPayload.data.some((item) => item.path === targetPath)).toBe(true)

		const deleteResponse = await app.handle(
			jsonRequest(`http://localhost/api/projects/${projectId}/worktrees`, 'DELETE', {
				targetPath,
			}),
		)
		expect(deleteResponse.status).toBe(200)
		const deletePayload = (await deleteResponse.json()) as { ok: boolean }
		expect(deletePayload.ok).toBe(true)

		const pruneResponse = await app.handle(
			jsonRequest(`http://localhost/api/projects/${projectId}/worktrees/prune`, 'POST', {}),
		)
		expect(pruneResponse.status).toBe(200)
		const prunePayload = (await pruneResponse.json()) as { ok: boolean }
		expect(prunePayload.ok).toBe(true)

		database.close()
	})
})
