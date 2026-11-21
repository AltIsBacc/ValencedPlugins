import { spawnSync } from 'node:child_process'
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const POOL_FILE = /^([^@/\\]+)@([^@/\\]+)\.zip$/
const VERSION = /^(\d+(?:\.\d+)*)(-[a-z0-9]+)?$/
const DEBUG_SUFFIX = '.debug'

interface Manifest {
	id: string
	name: string
	description?: string
	version: string
	[key: string]: unknown
}

interface PlannedFile {
	zip: string
	file: string
}

function fail(message: string): never {
	console.error(`error: ${message}`)
	process.exit(1)
}

function exec(command: string, args: string[], cwd?: string) {
	const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
	if (result.error) throw result.error
	if (result.status !== 0)
		throw new Error(`${command} exited with status ${result.status}`)
}

function debugVersion(version: string, build: number) {
	const match = VERSION.exec(version)
	if (!match) throw new Error(`Invalid version: ${version}`)
	const [, numbers = '', label = ''] = match
	return `${numbers}.${build}${label}`
}

function numbersOf(version: string) {
	const match = VERSION.exec(version)
	return match?.[1] ? match[1].split('.').map(Number) : []
}

function compareNumbers(a: number[], b: number[]) {
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const diff = (a[i] ?? 0) - (b[i] ?? 0)
		if (diff !== 0) return diff
	}
	return 0
}

function buildDebugZip(
	zip: string,
	outDir: string,
	build: number,
	commit: string,
) {
	const work = mkdtempSync(join(tmpdir(), 'debug-build-'))
	try {
		exec('unzip', ['-q', zip, '-d', work])

		const manifestPath = join(work, 'manifest.json')
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
		const id = `${manifest.id}${DEBUG_SUFFIX}`
		const version = debugVersion(manifest.version, build)
		const file = `${id}@${version}.zip`

		const debugManifest = {
			...manifest,
			id,
			name: `${manifest.name} (debug)`,
			description: [manifest.description, `(${commit})`]
				.filter(Boolean)
				.join(' '),
			version,
		}
		writeFileSync(
			manifestPath,
			`${JSON.stringify(debugManifest, null, '\t')}\n`,
		)

		const target = resolve(outDir, file)
		rmSync(target, { force: true })
		exec('zip', ['-q', '-r', '-X', target, '.'], work)

		return { zip: join(outDir, file), file } satisfies PlannedFile
	} finally {
		rmSync(work, { recursive: true, force: true })
	}
}

function pruneOldBuilds(pool: string, keep: number) {
	if (!existsSync(pool)) return

	const byId = new Map<string, { file: string; version: string }[]>()
	for (const file of readdirSync(pool)) {
		const match = POOL_FILE.exec(file)
		if (!match) continue
		const [, id = '', version = ''] = match
		if (!id.endsWith(DEBUG_SUFFIX)) continue
		byId.set(id, [...(byId.get(id) ?? []), { file, version }])
	}

	for (const builds of byId.values()) {
		builds.sort((a, b) =>
			compareNumbers(numbersOf(b.version), numbersOf(a.version)),
		)
		for (const { file } of builds.slice(keep)) {
			rmSync(join(pool, file))
			console.log(`- ${file}`)
		}
	}
}

function main() {
	const { values } = parseArgs({
		options: {
			dist: { type: 'string', default: 'build/dist' },
			out: { type: 'string', default: 'build/debug' },
			build: { type: 'string' },
			commit: { type: 'string' },
			plan: { type: 'string', default: 'debug-releases.json' },
			pool: { type: 'string' },
			keep: { type: 'string', default: '4' },
		},
	})

	const build = Number(values.build)
	if (!values.build || !Number.isInteger(build) || build < 0)
		fail('Pass --build <number>, the build number to put in the version.')

	const commit = values.commit?.slice(0, 7) ?? ''
	if (!/^[0-9a-f]{7}$/i.test(commit))
		fail('Pass --commit <sha>, the commit these builds come from.')

	const keep = Number(values.keep)
	if (!Number.isInteger(keep) || keep < 0)
		fail('--keep must be a whole number.')

	if (!existsSync(values.dist)) fail(`No dist directory at '${values.dist}'.`)
	const zips = readdirSync(values.dist)
		.filter(name => name.endsWith('.zip'))
		.sort()
	if (!zips.length) fail(`No plugin zips in '${values.dist}'.`)

	if (values.pool) pruneOldBuilds(values.pool, keep)

	mkdirSync(values.out, { recursive: true })
	const plan = zips.map(name =>
		buildDebugZip(join(values.dist, name), values.out, build, commit),
	)
	for (const { file } of plan) console.log(`+ ${file}`)

	writeFileSync(values.plan, `${JSON.stringify(plan, null, 2)}\n`)
	console.log(`✓ Wrote ${values.plan}: ${plan.length} debug build(s)`)
}

main()
