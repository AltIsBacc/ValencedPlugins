import { eq, inArray } from 'drizzle-orm'
import { attachments, edits, messages } from './schema'
import type { Attachment, MessageRecord } from '../logger'
import type { Database } from './client'

type MessageValues = ReturnType<typeof messageValues>
type AttachmentValues = ReturnType<typeof attachmentValues>

function messageValues(
	record: MessageRecord,
	guildId: string | undefined,
	now: Date,
) {
	return {
		id: record.id,
		channelId: record.channel_id,
		guildId: guildId ?? null,
		authorId: record.author.id,
		authorName: record.author.username ?? null,
		authorBot: !!record.author.bot,
		content: record.content ?? '',
		loggedAt: now,
	}
}

function attachmentValues(
	messageId: string,
	list: Attachment[],
	removed: boolean,
) {
	return list.map(attachment => ({
		id: attachment.id,
		messageId,
		filename: attachment.filename ?? null,
		url: attachment.url ?? null,
		size: attachment.size ?? null,
		contentType: attachment.content_type ?? null,
		removed,
	}))
}

function insertDeleted(
	db: Database,
	message: MessageValues,
	files: AttachmentValues,
) {
	return db.batch([
		db
			.insert(messages)
			.values({ ...message, deleted: true, deletedAt: message.loggedAt })
			.onConflictDoUpdate({
				target: messages.id,
				set: {
					content: message.content,
					deleted: true,
					deletedAt: message.loggedAt,
				},
			}),
		...(files.length
			? [db.insert(attachments).values(files).onConflictDoNothing()]
			: []),
	])
}

function insertEdit(db: Database, message: MessageValues, previous: string) {
	return db.batch([
		db
			.insert(messages)
			.values(message)
			.onConflictDoUpdate({
				target: messages.id,
				set: { content: message.content },
			}),
		db.insert(edits).values({
			messageId: message.id,
			content: previous,
			editedAt: message.loggedAt,
		}),
	])
}

function insertRemovedAttachments(
	db: Database,
	message: MessageValues,
	files: AttachmentValues,
) {
	return db.batch([
		db.insert(messages).values(message).onConflictDoNothing(),
		db
			.insert(attachments)
			.values(files)
			.onConflictDoUpdate({ target: attachments.id, set: { removed: true } }),
	])
}

function deleteMessage(db: Database, id: string) {
	return db.batch([
		db.delete(edits).where(eq(edits.messageId, id)),
		db.delete(attachments).where(eq(attachments.messageId, id)),
		db.delete(messages).where(eq(messages.id, id)),
	])
}

function deleteChannel(db: Database, channelId: string) {
	const ids = db
		.select({ id: messages.id })
		.from(messages)
		.where(eq(messages.channelId, channelId))

	return db.batch([
		db.delete(edits).where(inArray(edits.messageId, ids)),
		db.delete(attachments).where(inArray(attachments.messageId, ids)),
		db.delete(messages).where(eq(messages.channelId, channelId)),
	])
}

export function createLogStore(
	db: Database,
	ready: Promise<unknown>,
	onError: (error: unknown) => void,
) {
	let queue = ready.then(
		() => true,
		error => {
			onError(error)
			return false
		},
	)

	const enqueue = (task: () => unknown) => {
		queue = queue.then(async usable => {
			if (!usable) return false

			try {
				await task()
			} catch (error) {
				onError(error)
			}

			return true
		})
	}

	return {
		deleted(record: MessageRecord, guildId?: string) {
			const message = messageValues(record, guildId, new Date())
			const files = attachmentValues(record.id, record.attachments ?? [], false)
			enqueue(() => insertDeleted(db, message, files))
		},
		edited(record: MessageRecord, content: string, guildId?: string) {
			const message = { ...messageValues(record, guildId, new Date()), content }
			const previous = record.content
			enqueue(() => insertEdit(db, message, previous))
		},
		removedAttachments(
			record: MessageRecord,
			removed: Attachment[],
			guildId?: string,
		) {
			const message = messageValues(record, guildId, new Date())
			const files = attachmentValues(record.id, removed, true)
			enqueue(() => insertRemovedAttachments(db, message, files))
		},
		forgetMessage(id: string) {
			enqueue(() => deleteMessage(db, id))
		},
		forgetChannel(channelId: string) {
			enqueue(() => deleteChannel(db, channelId))
		},
		idle: () => queue.then(() => undefined),
	}
}

export type LogStore = ReturnType<typeof createLogStore>
