import { Tokens } from '@valenced/discord/common/tokens'
import { Stores } from '@valenced/discord/flux'
import { processColor } from 'react-native'
import { getLog, takeChanged } from './logger'
import { setDimmed } from './native'
import type { DiscordModules } from '@valenced/discord/types'
import type { MessageRecord } from './logger'

export interface GenerateArgs {
	message: MessageRecord
}

export interface MessageRow {
	type?: number
	changeType?: number
	message?: RowMessage
}

interface RowMessage {
	id: string
	content?: ContentNode[]
	edited?: string
	editedColor?: number | null
	textColor?: number
	timestampColor?: number
}

interface ContentNode {
	type?: string
	content?: unknown
	items?: ContentNode[][]
}

export interface RowManager {
	generate(args: GenerateArgs): MessageRow
}

const MessageRowType = 1
const UpdateChangeType = 2

const HistoryStart = '\ue0a0'
const HistoryEnd = '\ue0a1'
const EditedStart = '\ue0a2'
const EditedSeparator = '\ue0a3'
const EditedEnd = '\ue0a4'
const MentionStart = '\ue0a5'
const MentionSeparator = '\ue0a6'
const MentionEnd = '\ue0a7'

const MentionTypes = new Set(['mention', 'channelMention'])

type ThemeStore = DiscordModules.Flux.Store<{ theme: string }>

export function styleRow(
	row: MessageRow,
	args: GenerateArgs,
	generate: (args: GenerateArgs) => MessageRow,
) {
	const message = row?.type === MessageRowType ? row.message : undefined
	if (!message) return

	if (takeChanged(message.id)) row.changeType = UpdateChangeType

	const log = getLog(message.id)
	const attachments = args.message.attachments.map(({ id }) => id)

	const deletedAttachments = new Set(
		!log?.highlighted ? [] : log.deleted ? attachments : log.removedAttachments,
	)
	setDimmed(deletedAttachments, true)
	setDimmed(
		attachments.filter(id => !deletedAttachments.has(id)),
		false,
	)
	setDimmed([message.id], !!(log?.deleted && log.highlighted))

	if (!log) return

	if (log.edits.length)
		message.content = [
			...history(log.edits, message, args, generate),
			...(message.content ?? []),
		]

	if (log.deleted && log.highlighted) {
		const color = criticalColor()
		message.textColor = color
		message.timestampColor = color
		if (message.content) message.content = colorMentions(message.content, color)
	}
}

function colorMentions(nodes: ContentNode[], color: number): ContentNode[] {
	return nodes.flatMap(node => {
		if (node.type && MentionTypes.has(node.type))
			return [
				text(`${MentionStart}${color}${MentionSeparator}`),
				node,
				text(MentionEnd),
			]

		if (Array.isArray(node.content))
			node = { ...node, content: colorMentions(node.content, color) }
		if (Array.isArray(node.items))
			node = {
				...node,
				items: node.items.map(item => colorMentions(item, color)),
			}

		return [node]
	})
}

function history(
	edits: MessageRecord[],
	message: RowMessage,
	args: GenerateArgs,
	generate: (args: GenerateArgs) => MessageRow,
) {
	const label = `${EditedStart}${message.editedColor ?? ''}${EditedSeparator} (${message.edited || 'edited'})${EditedEnd}\n`

	return edits.flatMap(record => [
		text(HistoryStart),
		...(generate({ ...args, message: record }).message?.content ?? []),
		text(HistoryEnd),
		text(label),
	])
}

const text = (content: string) => ({ type: 'text', content })

function criticalColor() {
	const theme = (Stores.ThemeStore as ThemeStore).theme
	const { colors, internal } = Tokens.default

	return processColor(
		internal.resolveSemanticColor(theme, colors.TEXT_FEEDBACK_CRITICAL),
	) as number
}
