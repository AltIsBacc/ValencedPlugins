import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const messages = sqliteTable(
	'messages',
	{
		id: text('id').primaryKey(),
		channelId: text('channel_id').notNull(),
		guildId: text('guild_id'),
		authorId: text('author_id').notNull(),
		authorName: text('author_name'),
		authorBot: integer('author_bot', { mode: 'boolean' })
			.notNull()
			.$defaultFn(() => false),
		content: text('content').notNull().default(''),
		deleted: integer('deleted', { mode: 'boolean' })
			.notNull()
			.$defaultFn(() => false),
		deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
		loggedAt: integer('logged_at', { mode: 'timestamp_ms' }).notNull(),
	},
	table => [
		index('messages_channel_id_idx').on(table.channelId),
		index('messages_author_id_idx').on(table.authorId),
	],
)

export const edits = sqliteTable(
	'edits',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		messageId: text('message_id')
			.notNull()
			.references(() => messages.id, { onDelete: 'cascade' }),
		content: text('content').notNull(),
		editedAt: integer('edited_at', { mode: 'timestamp_ms' }).notNull(),
	},
	table => [index('edits_message_id_idx').on(table.messageId)],
)

export const attachments = sqliteTable(
	'attachments',
	{
		id: text('id').primaryKey(),
		messageId: text('message_id')
			.notNull()
			.references(() => messages.id, { onDelete: 'cascade' }),
		filename: text('filename'),
		url: text('url'),
		size: integer('size'),
		contentType: text('content_type'),
		removed: integer('removed', { mode: 'boolean' })
			.notNull()
			.$defaultFn(() => false),
	},
	table => [index('attachments_message_id_idx').on(table.messageId)],
)
