export interface QuestionOption {
	label: string;
	description?: string;
}

export interface QuestionSsePayload {
	questionId: string;
	question: string;
	header: string;
	options: QuestionOption[];
	multiple: boolean;
	conversationId?: string;
}

export type QuestionEmitter = (payload: QuestionSsePayload) => void;

// Module-level mutable emitter for SSE stream integration
let currentEmitter: QuestionEmitter | null = null;

export function setQuestionEmitter(emitter: QuestionEmitter | null): void {
	currentEmitter = emitter;
}

export function getQuestionEmitter(): QuestionEmitter | null {
	return currentEmitter;
}

export function createQuestionEmitter(
	conversationId: string,
	emit: QuestionEmitter,
): QuestionEmitter {
	return (payload: QuestionSsePayload): void => {
		emit({
			...payload,
			conversationId,
		});
	};
}
