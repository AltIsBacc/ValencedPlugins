import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const root = resolve(import.meta.dirname, '..')

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		id: { type: 'string' },
		prefix: { type: 'string', default: 'com.example' },
		name: { type: 'string' },
		description: { type: 'string' },
		author: { type: 'string', default: 'Your Name' },
		native: { type: 'boolean', default: false },
		'no-js': { type: 'boolean', default: false },
		theme: { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false },
	},
})

if (values.help || positionals.length !== 1) {
	console.log(
		'Usage: bun run new <folder> [--id <id>] [--prefix <prefix>] [--name <name>]\n' +
			'                          [--description <text>] [--author <text>]\n' +
			'                          [--native] [--no-js] [--theme]',
	)
	process.exit(values.help ? 0 : 1)
}

function fail(message: string): never {
	console.error(`error: ${message}`)
	process.exit(1)
}

const folder = positionals[0]!
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(folder)) {
	fail(
		`folder "${folder}" must be kebab-case (lowercase letters, digits, dashes)`,
	)
}

const id = values.id ?? `${values.prefix}.${folder}`
if (!/^[a-z0-9]+([._-][a-z0-9]+)*$/.test(id)) {
	fail(
		`id "${id}" may only contain lowercase letters, digits, ".", "-" and "_"`,
	)
}
if (id === 'valenced.api' || id === 'discord') {
	fail(`id "${id}" is reserved`)
}

const withNative = values.native || values['no-js']
const withJs = !values['no-js']
const kind = values.theme ? 'themes' : 'plugins'

for (const dir of ['plugins', 'themes']) {
	if (existsSync(join(root, dir, folder)))
		fail(`${dir}/${folder} already exists`)
}

const titleCase = (s: string) =>
	s
		.split(/[-_.]/)
		.filter(Boolean)
		.map(part => part[0]!.toUpperCase() + part.slice(1))
		.join(' ')

const pascalCase = (s: string) => titleCase(s).replaceAll(' ', '')

const displayName = values.name ?? titleCase(folder)
const description = values.description ?? `${displayName}.`

const kotlinPackage = id
	.split('.')
	.map(segment => {
		const clean = segment.replace(/[^A-Za-z0-9_]/g, '_')
		return /^[0-9]/.test(clean) ? `_${clean}` : clean
	})
	.join('.')

const classBase = /^[0-9]/.test(pascalCase(folder))
	? `Plugin${pascalCase(folder)}`
	: pascalCase(folder)
const valName = classBase[0]!.toLowerCase() + classBase.slice(1)

const dependencies: Record<string, { version: string }> = {
	'valenced.api': { version: '>=1 <2' },
	discord: { version: '*' },
}
if (values.theme) dependencies['valenced.api.themes'] = { version: '*' }

const manifest: Record<string, unknown> = {
	format: 1,
	id,
	name: displayName,
	description,
	author: values.author,
	version: '1.0.0',
	dependencies,
	dist: {
		...(withJs ? { script: 'index.js' } : {}),
		...(withNative
			? {
					android: {
						path: 'plugin.jar',
						class: `${kotlinPackage}.${classBase}`,
					},
				}
			: {}),
	},
}

const jsEntry = values.theme
	? `/// <reference types="@valenced/themes-api" />

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('${folder}', { name: '${displayName}' })

		themes.registerTheme('${folder}', 'default', {
			name: '${displayName}',
			// Returning an empty object means no color overrides.
			getColors: () => ({}),
		})
	},
})
`
	: `export default plugin({
	start() {
		console.log('[${folder}] started')
	},
	stop() {
		console.log('[${folder}] stopped')
	},
})
`

const kotlinEntry = `@file:JvmName("${classBase}")

package ${kotlinPackage}

import app.valenced.plugins.plugin

@Suppress("UNUSED")
val ${valName} = plugin {
    start {
        log.i("Loaded \${manifest.name} (\${manifest.id}) in \${appInfo.packageName}")
    }

    stop {
        log.i("Unloaded \${manifest.id}")
    }
}
`

const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" />
`

const files = new Map<string, string>()
files.set('manifest.json', `${JSON.stringify(manifest, null, '\t')}\n`)
files.set(
	'tsconfig.json',
	`${JSON.stringify({ extends: '../../tsconfig.base.json' }, null, '\t')}\n`,
)
if (withJs) files.set('js/index.ts', jsEntry)
if (withNative) {
	files.set('src/main/AndroidManifest.xml', androidManifest)
	files.set(
		`src/main/kotlin/${kotlinPackage.replaceAll('.', '/')}/${classBase}.kt`,
		kotlinEntry,
	)
}

const base = join(root, kind, folder)
for (const [path, content] of files) {
	const target = join(base, path)
	await mkdir(dirname(target), { recursive: true })
	await writeFile(target, content)
}

console.log(`Created ${kind}/${folder} (${id})`)
for (const path of files.keys()) console.log(`  ${kind}/${folder}/${path}`)

console.log(
	`\nNext:\n  bun run lint:types\n  ./gradlew package${titleCase(folder).replaceAll(' ', '')}`,
)
