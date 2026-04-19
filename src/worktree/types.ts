import type { Result } from '../types/result.js'

export type WorktreeErrorCode =
	| 'worktree_exists'
	| 'branch_exists'
	| 'path_conflict'
	| 'dirty_worktree'
	| 'not_a_repo'
	| 'git_unavailable'
	| 'git_failed'

export interface GitError {
	code: WorktreeErrorCode
	message: string
	stderr: string
	exitCode: number
}

export interface WorktreeError {
	code: WorktreeErrorCode
	message: string
	stderr?: string
	exitCode?: number
}

export interface WorktreeSummary {
	path: string
	head: string
	branch: string | null
	isDetached: boolean
	isBare: boolean
	isLocked: boolean
	lockReason?: string
	isPrunable: boolean
	isDirty: boolean
}

export interface PorcelainStatusSummary {
	clean: boolean
	fileCount: number
}

export type GitResult<T> = Result<T, GitError>
export type WorktreeResult<T> = Result<T, WorktreeError>
