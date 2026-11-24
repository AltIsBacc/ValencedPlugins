import {
	callNativeMethod,
	callNativeMethodSync,
} from '@valenced/modules/native'
import type { Executor } from './db/client'

const dimmed = new Set<string>()

export function setDimmed(ids: Iterable<string>, dim: boolean) {
	const changed = [...ids].filter(id => dimmed.has(id) !== dim)
	if (!changed.length) return

	for (const id of changed) dim ? dimmed.add(id) : dimmed.delete(id)
	callNativeMethodSync('altisbacc.message-logger.setDimmed', [
		JSON.stringify(changed),
		dim,
	])
}

export function clearDimmed() {
	dimmed.clear()
	callNativeMethodSync('altisbacc.message-logger.clear', [])
}

export const executeQueries: Executor = async queries =>
	JSON.parse(
		await callNativeMethod('altisbacc.message-logger.sql', [
			JSON.stringify(queries),
		]),
	)

export const exportDatabase = () =>
	callNativeMethod('altisbacc.message-logger.export', [])

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'altisbacc.message-logger.setDimmed': [[json: string, dim: boolean], null]
		'altisbacc.message-logger.clear': [[], null]
		'altisbacc.message-logger.sql': [[queries: string], string]
		'altisbacc.message-logger.export': [[], string]
	}
}
