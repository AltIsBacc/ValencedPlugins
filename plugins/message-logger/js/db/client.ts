import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { migrations } from './migrations'

export type QueryMethod = 'run' | 'all' | 'values' | 'get'

export interface Query {
	sql: string
	params: unknown[]
	method: QueryMethod
}

export interface QueryResult {
	rows: any[]
}

export type Executor = (queries: Query[]) => Promise<QueryResult[]>

export function createDatabase(execute: Executor) {
	return drizzle(
		async (sql, params, method) => {
			const [result] = await execute([{ sql, params, method }])
			return result!
		},
		queries => execute(queries),
	)
}

export type Database = ReturnType<typeof createDatabase>

export async function migrate(execute: Executor) {
	await execute([
		{
			sql: 'CREATE TABLE IF NOT EXISTS `__migrations` (`id` integer PRIMARY KEY NOT NULL)',
			params: [],
			method: 'run',
		},
	])

	const [applied] = await execute([
		{ sql: 'SELECT `id` FROM `__migrations`', params: [], method: 'all' },
	])
	const done = new Set(applied!.rows.map(row => row[0]))

	for (const [id, statements] of migrations.entries()) {
		if (done.has(id)) continue

		await execute([
			...statements.map(sql => ({ sql, params: [], method: 'run' as const })),
			{
				sql: 'INSERT INTO `__migrations` (`id`) VALUES (?)',
				params: [id],
				method: 'run',
			},
		])
	}
}
