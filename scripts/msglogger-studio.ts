import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const database = process.argv[2]

if (!database) {
	console.error('Usage: bun run msglogger:studio <path to msglogger.db>')
	process.exit(1)
}

const path = resolve(database)
if (!existsSync(path)) {
	console.error(`error: ${path} does not exist`)
	process.exit(1)
}

const { status } = spawnSync(
	'bunx',
	['drizzle-kit', 'studio', '--config', 'scripts/msglogger.drizzle.config.ts'],
	{
		cwd: root,
		env: { ...process.env, MSGLOGGER_DB: path },
		stdio: 'inherit',
		shell: process.platform === 'win32',
	},
)

process.exit(status ?? 1)
