import { describe, it, expect, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Elysia } from 'elysia';

import { Database } from '../db/database.ts';
import { insertProject } from '../db/repo/projects.ts';
import { mountProjectsListRoute } from './routes-projects.ts';

function createTestDb(): Database {
	const dir = join(tmpdir(), `elefant-test-${crypto.randomUUID()}`);
	mkdirSync(dir, { recursive: true });
	return new Database(join(dir, 'test.db'));
}

function cleanupDb(db: Database): void {
	const dbPath = (db.db as unknown as { filename: string }).filename;
	db.close();
	const dir = dbPath.replace('/test.db', '');
	rmSync(dir, { recursive: true, force: true });
}

function createTestApp(db: Database): Elysia {
	const app = new Elysia();
	mountProjectsListRoute(app, db);
	return app;
}

describe('GET /api/projects', () => {
	let db: Database;

	afterEach(() => cleanupDb(db));

	it('returns 200 with empty array when no projects exist', async () => {
		db = createTestDb();
		const app = createTestApp(db);

		const response = await app.handle(new Request('http://localhost/api/projects'));
		const payload = (await response.json()) as unknown[];

		expect(response.status).toBe(200);
		expect(Array.isArray(payload)).toBe(true);
		expect(payload.length).toBe(0);
	});

	it('returns 200 with projects sorted by updated_at DESC', async () => {
		db = createTestDb();
		const app = createTestApp(db);

		// Insert two projects with different timestamps
		const id1 = crypto.randomUUID();
		const id2 = crypto.randomUUID();

		insertProject(db, {
			id: id1,
			name: 'Old Project',
			path: '/tmp/old',
		});

		// Ensure different timestamps (SQLite datetime('now') has second precision)
		await new Promise((r) => setTimeout(r, 1100));

		insertProject(db, {
			id: id2,
			name: 'New Project',
			path: '/tmp/new',
		});

		const response = await app.handle(new Request('http://localhost/api/projects'));
		const payload = (await response.json()) as Array<{
			id: string;
			name: string;
			path: string;
			updated_at: string;
		}>;

		expect(response.status).toBe(200);
		expect(Array.isArray(payload)).toBe(true);
		expect(payload.length).toBe(2);
		// Most recently updated first
		expect(payload[0].name).toBe('New Project');
		expect(payload[1].name).toBe('Old Project');
	});
});
