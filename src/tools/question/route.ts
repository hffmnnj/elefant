/**
 * Question route — HTTP endpoint for answering questions from the desktop app.
 */

import type { Elysia } from 'elysia';
import { z } from 'zod';
import { questionBroker } from './broker.js';

const answerSchema = z.object({
	answers: z.array(z.string()).min(1),
});

export function registerQuestionRoute(app: Elysia): void {
	app.post('/tools/question/answer/:questionId', async ({ params, body }) => {
		const questionId = params.questionId;

		const parsed = answerSchema.safeParse(body);
		if (!parsed.success) {
			return Response.json(
				{ ok: false, error: 'Invalid request body', details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const answered = questionBroker.answer(questionId, { answers: parsed.data.answers });
		if (!answered) {
			return Response.json(
				{ ok: false, error: 'Question not found or already answered' },
				{ status: 404 },
			);
		}
		return Response.json({ ok: true });
	});
}
