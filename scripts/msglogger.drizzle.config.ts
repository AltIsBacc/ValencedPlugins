import { resolve } from 'node:path'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	dialect: 'sqlite',
	schema: './plugins/message-logger/js/db/schema.ts',
	dbCredentials: {
		url: resolve(process.env.MSGLOGGER_DB ?? 'msglogger.db'),
	},
})
