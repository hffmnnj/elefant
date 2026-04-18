import type { Elysia } from 'elysia';
import type { SseManager } from '../transport/sse-manager.ts';
import type { Database } from '../db/database.ts';
import { z } from 'zod';
import { getProjectById, updateProject, deleteProject, listProjects } from '../db/repo/projects.ts';

export function mountProjectEventsRoute(app: Elysia, sse: SseManager): Elysia {
	return app.get('/api/projects/:id/events', ({ params, request }) => {
		const lastEventId = request.headers.get('Last-Event-ID') ?? undefined;
		return sse.subscribe(params.id, lastEventId);
	});
}

export function mountProjectsListRoute(app: Elysia, db: Database): Elysia {
	return app.get('/api/projects', () => {
		const result = listProjects(db);
		if (result.ok) {
			return result.data;
		}
		return { error: result.error.message };
	});
}

const ProjectUpdateBodySchema = z.object({
	name: z.string().optional(),
	description: z.string().optional(),
});

export function mountProjectsUpdateRoute(app: Elysia, db: Database): Elysia {
	return app.put('/api/projects/:id', ({ params, body, set }) => {
		const parsed = ProjectUpdateBodySchema.safeParse(body);
		if (!parsed.success) {
			set.status = 400;
			return { ok: false, error: parsed.error.message };
		}

		const existing = getProjectById(db, params.id);
		if (!existing.ok) {
			set.status = 404;
			return { ok: false, error: existing.error.message };
		}

		const updated = updateProject(db, { id: params.id, ...parsed.data });
		if (!updated.ok) {
			set.status = 500;
			return { ok: false, error: updated.error.message };
		}

		return { ok: true, data: updated.data };
	});
}

export function mountProjectsDeleteRoute(app: Elysia, db: Database): Elysia {
	return app.delete('/api/projects/:id', ({ params, set }) => {
		const existing = getProjectById(db, params.id);
		if (!existing.ok) {
			set.status = 404;
			return { ok: false, error: existing.error.message };
		}

		const result = deleteProject(db, params.id);
		if (!result.ok) {
			set.status = 500;
			return { ok: false, error: result.error.message };
		}

		set.status = 204;
		return undefined;
	});
}
