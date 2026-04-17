import { loadConfig } from '../config/index.ts'
import { createDaemon } from './create.ts'
import { removePid, writePid } from './pid.ts'
import { gracefulShutdown } from './shutdown.ts'

const configResult = await loadConfig()
if (!configResult.ok) {
	console.error('Config error:', configResult.error.message)
	process.exit(1)
}

const daemonResult = await createDaemon(configResult.data)
if (!daemonResult.ok) {
	console.error('Daemon error:', daemonResult.error.message)
	process.exit(1)
}

const pidWriteResult = await writePid(process.pid)
if (!pidWriteResult.ok) {
	console.error('PID error:', pidWriteResult.error.message)
	process.exit(1)
}

await daemonResult.data.start()

process.on('SIGTERM', () => {
	void gracefulShutdown('SIGTERM', daemonResult.data)
})

process.on('SIGINT', () => {
	void gracefulShutdown('SIGINT', daemonResult.data)
})

process.on('exit', () => {
	void removePid()
})
