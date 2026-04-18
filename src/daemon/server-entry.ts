import { loadConfig } from '../config/index.ts'
import { createDaemon } from './create.ts'
import { removePid, writePid } from './pid.ts'
import { gracefulShutdown } from './shutdown.ts'

const configResult = await loadConfig()
if (!configResult.ok) {
	console.error('[elefant] Config error:', configResult.error.message)
	process.exit(1)
}

const daemonResult = await createDaemon(configResult.data)
if (!daemonResult.ok) {
	console.error('[elefant] Daemon error:', daemonResult.error.message)
	process.exit(1)
}

const pidResult = await writePid(process.pid)
if (!pidResult.ok) {
	console.error('[elefant] PID error:', pidResult.error.message)
	process.exit(1)
}

process.on('exit', () => { void removePid() })
process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM', daemonResult.data) })
process.on('SIGINT', () => { void gracefulShutdown('SIGINT', daemonResult.data) })

await daemonResult.data.start()
