export type Risk = 'low' | 'medium' | 'high';

export type PermissionDecisionStatus = 'allow' | 'ask' | 'deny';

export type PermissionDecisionSource = 'hook' | 'user' | 'default';

export interface Decision {
	approved: boolean;
	status: PermissionDecisionStatus;
	reason: string;
	risk: Risk;
	source: PermissionDecisionSource;
}

export function statusFromApproval(
	approved: boolean,
): PermissionDecisionStatus {
	return approved ? 'allow' : 'deny';
}

export interface ClassifierRule {
	tool: string | RegExp;
	argsPattern?: (args: Record<string, unknown>) => boolean;
	risk: Risk;
}
