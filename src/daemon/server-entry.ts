import { loadConfig, isDefaultConfig } from '../config/index.ts'
import { createDaemon } from './create.ts'
import { removePid, writePid } from './pid.ts'
import { gracefulShutdown } from './shutdown.ts'

const CONFIG_RETRY_MS = 3_000
const CONFIG_POLL_MAX = 200 // ~10 minutes

// Write PID immediately so the desktop UI knows the process is alive
// even before a valid config exists.
const earlyPidResult = await writePid(process.pid)
if (!earlyPidResult.ok) {
	console.error('PID error:', earlyPidResult.error.message)
	process.exit(1)
}

process.on('exit', () => {
	void removePid()
})

/**
 * Poll until a fully-configured (non-template) config is ready.
 * Allows the user to fill in their API key via the Settings UI
 * without manually restarting the daemon.
 */
async function waitForConfig() {
	for (let attempt = 0; attempt < CONFIG_POLL_MAX; attempt++) {
		const result = await loadConfig()

		if (result.ok) {
			if (isDefaultConfig(result.data)) {
				if (attempt === 0) {
					console.error(
						'Config found but API key is still the placeholder value.\n' +
						'Open Elefant → Settings → Providers and enter your real API key.',
					)
				}
				await new Promise<void>((r) => setTimeout(r, CONFIG_RETRY_MS))
				continue
			}
			return result.data
		}

		if (attempt === 0) {
			console.error('Config:', result.error.message)
		}

		await new Promise<void>((r) => setTimeout(r, CONFIG_RETRY_MS))
	}

	console.error('Timed out waiting for a valid config. Exiting.')
	process.exit(1)
}

const config = await waitForConfig()

const daemonResult = await createDaemon(config)
if (!daemonResult.ok) {
	console.error('Daemon error:', daemonResult.error.message)
	process.exit(1)
}

await daemonResult.data.start()

process.on('SIGTERM', () => {
	void gracefulShutdown('SIGTERM', daemonResult.data)
})

process.on('SIGINT', () => {
	void gracefulShutdown('SIGINT', daemonResult.data)
})
