export const LOCAL_DAEMON_CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
} as const

export function applyLocalDaemonCors(headers: Headers): void {
	for (const [name, value] of Object.entries(LOCAL_DAEMON_CORS_HEADERS)) {
		headers.set(name, value)
	}
}
