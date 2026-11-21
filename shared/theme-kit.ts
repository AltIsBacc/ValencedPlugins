import { AshColors, LightColors } from '#shared/discord-defaults'
import type { ThemeColors } from '@valenced/themes-api/types'

export interface Palette {
	rail: string

	floor: string

	panel: string

	page: string

	card: string

	popup: string

	input: string

	control: string

	pressed: string

	heading: string
	strong: string
	text: string
	subtle: string
	muted: string
	faint: string

	divider: string
	border: string
	borderStrong: string

	accent: string
	accentPress: string
	onAccent: string
	accentSoft: string
	accentText: string
	brand: string
	rowIcon: string

	selection: string

	link: string
	mentionText: string

	mentionPill: string

	mentionBg: string

	replyBg: string
	keyword: string
	code: string
	codeText: string
	spoiler: string
	spoilerRevealed: string

	positive: string
	warning: string
	danger: string
	dangerFill: string
	scrim: string
}

export interface Hues {
	red: string
	orange: string
	yellow: string
	green: string
	teal: string
	blue: string
	blurple: string
	purple: string
	pink: string
}

export interface Tone {
	greys: [string, string][]

	hues: Hues
}

export interface Look {
	palette: Palette

	extra?: Record<string, string>

	tone?: Tone
}

type Vec3 = [number, number, number]

const RGB_TO_LMS: Vec3[] = [
	[0.4122214708, 0.5363325363, 0.0514459929],
	[0.2119034982, 0.6806995451, 0.1073969566],
	[0.0883024619, 0.2817188376, 0.6299787005],
]
const LMS_TO_LAB: Vec3[] = [
	[0.2104542553, 0.793617785, -0.0040720468],
	[1.9779984951, -2.428592205, 0.4505937099],
	[0.0259040371, 0.7827717662, -0.808675766],
]
const LAB_TO_LMS: Vec3[] = [
	[1, 0.3963377774, 0.2158037573],
	[1, -0.1055613458, -0.0638541728],
	[1, -0.0894841775, -1.291485548],
]
const LMS_TO_RGB: Vec3[] = [
	[4.0767416621, -3.3077115913, 0.2309699292],
	[-1.2684380046, 2.6097574011, -0.3413193965],
	[-0.0041960863, -0.7034186147, 1.707614701],
]

const apply = (m: Vec3[], v: Vec3): Vec3 =>
	m.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3

const decode = (u: number) =>
	u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4
const encode = (u: number) =>
	u <= 0.0031308 ? u * 12.92 : 1.055 * u ** (1 / 2.4) - 0.055

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i

function channels(hex: string): Vec3 {
	const n = Number.parseInt(hex.slice(1, 7), 16)
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255) as Vec3
}

function toLab(hex: string): Vec3 {
	const lms = apply(RGB_TO_LMS, channels(hex).map(decode) as Vec3)
	return apply(LMS_TO_LAB, lms.map(Math.cbrt) as Vec3)
}

function labToLinear(lab: Vec3): Vec3 {
	const lms = apply(LAB_TO_LMS, lab).map(v => v ** 3) as Vec3
	return apply(LMS_TO_RGB, lms)
}

const fits = (rgb: Vec3) => rgb.every(v => v > -1e-4 && v < 1 + 1e-4)

function toHex(lab: Vec3): string {
	let rgb = labToLinear(lab)
	if (!fits(rgb)) {
		let keep = 0
		let drop = 1
		for (let step = 0; step < 14; step++) {
			const probe = (keep + drop) / 2
			if (fits(labToLinear([lab[0], lab[1] * probe, lab[2] * probe])))
				keep = probe
			else drop = probe
		}
		rgb = labToLinear([lab[0], lab[1] * keep, lab[2] * keep])
	}
	return rgb.reduce((out, v) => {
		const byte = Math.round(Math.min(1, Math.max(0, encode(v))) * 255)
		return out + byte.toString(16).padStart(2, '0')
	}, '#')
}

const chromaOf = (lab: Vec3) => Math.hypot(lab[1], lab[2])
const hueOf = (lab: Vec3) => Math.atan2(lab[2], lab[1])

function hueGap(a: number, b: number) {
	const gap = Math.abs(a - b) % (Math.PI * 2)
	return Math.min(gap, Math.PI * 2 - gap)
}

export function mix(a: string, b: string, t: number) {
	const from = toLab(a)
	const to = toLab(b)
	return toHex(from.map((v, i) => v + (to[i]! - v) * t) as Vec3)
}

export function over(top: string, bottom: string) {
	if (top.length !== 9) return top
	const opacity = Number.parseInt(top.slice(7), 16) / 255
	const above = channels(top)
	const below = channels(bottom)
	return above.reduce((out, v, i) => {
		const byte = Math.round((v * opacity + below[i]! * (1 - opacity)) * 255)
		return out + byte.toString(16).padStart(2, '0')
	}, '#')
}

const withAlpha = (color: string, value: string) => color.slice(0, 7) + value

const opaque = (color: string) => (color.length === 7 ? `${color}ff` : color)

const STOCK_HUES: Hues = {
	red: '#d22d39',
	orange: '#fe6e0d',
	yellow: '#faaa00',
	green: '#23a55a',
	teal: '#4cb5bf',
	blue: '#0074e3',
	blurple: '#5865f2',
	purple: '#a056f2',
	pink: '#ff4cd2',
}

const NEUTRAL_CHROMA = 0.035

export function toneMapper(tone: Tone) {
	const ramp = tone.greys.map(([stock, themed]) => ({
		at: toLab(stock)[0],
		lab: toLab(themed),
	}))
	const families = (Object.keys(STOCK_HUES) as (keyof Hues)[]).map(name => {
		const stock = toLab(STOCK_HUES[name])
		const themed = toLab(tone.hues[name])
		return {
			stockL: stock[0],
			stockC: chromaOf(stock),
			stockH: hueOf(stock),
			themedL: themed[0],
			themedC: chromaOf(themed),
			themedH: hueOf(themed),
		}
	})
	const seen = new Map<string, string>()

	const neutral = (lightness: number): Vec3 => {
		const lowest = ramp[0]!
		const highest = ramp[ramp.length - 1]!
		if (lightness <= lowest.at) return lowest.lab
		if (lightness >= highest.at) return highest.lab
		const upper = ramp.findIndex(stop => stop.at >= lightness)
		const a = ramp[upper - 1]!
		const b = ramp[upper]!
		const t = (lightness - a.at) / (b.at - a.at || 1)
		return a.lab.map((v, i) => v + (b.lab[i]! - v) * t) as Vec3
	}

	const tinted = (lab: Vec3): Vec3 => {
		const hue = hueOf(lab)
		const family = families.reduce((best, next) =>
			hueGap(hue, next.stockH) < hueGap(hue, best.stockH) ? next : best,
		)
		const lightness = Math.min(
			0.99,
			Math.max(0.02, family.themedL + (lab[0] - family.stockL)),
		)
		const chroma =
			family.themedC * Math.min(1.25, chromaOf(lab) / family.stockC)
		return [
			lightness,
			chroma * Math.cos(family.themedH),
			chroma * Math.sin(family.themedH),
		]
	}

	return (value: string) => {
		if (!HEX.test(value)) return value
		const opaquePart = value.slice(0, 7).toLowerCase()
		let result = seen.get(opaquePart)
		if (result === undefined) {
			const lab = toLab(opaquePart)
			result = toHex(
				chromaOf(lab) < NEUTRAL_CHROMA ? neutral(lab[0]) : tinted(lab),
			)
			seen.set(opaquePart, result)
		}
		return result + value.slice(7)
	}
}

type Role = keyof Palette

const PLAIN: Record<Role, string[]> = {
	rail: [
		'BACKGROUND_BASE_LOWEST',
		'ANDROID_NAVIGATION_BAR_BACKGROUND',
		'USER_PROFILE_GRADIENT_BACKGROUND',
		'GUILD_PROFILE_BANNER_BACKGROUND_DEFAULT',
		'MOBILE_VOICE_PANEL_BACKGROUND',
		'GUILD_NOTIFICATIONS_BOTTOM_SHEET_PILL_BACKGROUND',
	],
	floor: [
		'BACKGROUND_BASE_LOWER',
		'CHANNEL_BACKGROUND_DEFAULT',
		'STANDALONE_CHANNEL_CONTENT_BACKGROUND',
		'MOBILE_KEYBOARD_GAP_BACKGROUND',
		'MOBILE_SEARCHBAR_GRADIENT_BACKGROUND',
		'MOBILE_TYPING_INDICATOR_BACKGROUND_DEFAULT',
		'MOBILE_FLOATINGBAR_BACKGROUND_SCRIM',
	],
	panel: ['BACKGROUND_BASE_LOW', 'BACKGROUND_SECONDARY_ALT', 'PANEL_BG'],
	page: [
		'MOBILE_ACTIONSHEET_BACKGROUND',
		'MOBILE_ACTIONSHEET_GRADIENT_BACKGROUND_DEFAULT',
		'MOBILE_EXPRESSION_PICKER_BACKGROUND_DEFAULT',
		'MOBILE_KEYBOARD_PANEL_BACKGROUND',
		'MOBILE_COMMAND_BAR_BACKGROUND',
		'MODAL_BACKGROUND',
		'MODAL_FOOTER_BACKGROUND',
		'TAB_BAR_BACKGROUND',
	],
	card: [
		'BACKGROUND_SURFACE_HIGH',
		'BG_SURFACE_RAISED',
		'CHAT_BANNER_BG',
		'EMBED_BACKGROUND',
		'EMBED_BACKGROUND_ALTERNATE',
		'MOBILE_EMBED_BACKGROUND_DEFAULT',
		'MOBILE_THREAD_EMBED_BACKGROUND',
		'MOBILE_COMMAND_CATEGORIES_BACKGROUND',
		'MOBILE_GUILDBAR_ICON_BACKGROUND_DEFAULT',
		'MOBILE_SEGMENTED_CONTROL_BACKGROUND',
		'MOBILE_VOICE_MESSAGE_RECORDING_LOCK_BACKGROUND_DEFAULT',
		'MOBILE_FLOATINGBAR_BACKGROUND_NAMEPLATE',
		'POLLS_NORMAL_IMAGE_BACKGROUND',
		'VOICE_CHANNEL_USER_LIMIT_BACKGROUND',
		'REACTION_BACKGROUND_DEFAULT',
	],
	popup: [
		'BACKGROUND_SURFACE_HIGHEST',
		'MOBILE_ALERT_BACKGROUND_DEFAULT',
		'MOBILE_COACHMARK_BACKGROUND_DEFAULT',
		'MOBILE_TOAST_BACKGROUND_DEFAULT',
		'MOBILE_FLOATINGBAR_BACKGROUND',
		'MOBILE_FLOATINGBAR_BACKGROUND_HIGHER',
		'MOBILE_FLOATING_ACCESSORY_BACKGROUND',
		'CUSTOM_STATUS_BUBBLE_BG',
	],
	input: [
		'MOBILE_CHATINPUT_BACKGROUND_DEFAULT',
		'MOBILE_CHATINPUT_BACKGROUND_ACTIVE',
		'REDESIGN_CHAT_INPUT_BACKGROUND',
		'CHANNELTEXTAREA_BACKGROUND',
		'CHAT_INPUT_BACKGROUND',
		'SHARE_CHAT_INPUT_BACKGROUND',
		'INPUT_BACKGROUND_DEFAULT',
	],
	control: [
		'BACKGROUND_ACCENT',
		'MOBILE_SEGMENTED_CONTROL_INDICATOR_BACKGROUND',
		'CONTROL_SECONDARY_BACKGROUND_DEFAULT',
		'SWITCH_BACKGROUND_DEFAULT',
		'SWITCH_THUMB_ICON_DEFAULT',
	],
	pressed: [
		'REDESIGN_INPUT_CONTROL_ACTIVE_BG',
		'CONTROL_SECONDARY_BACKGROUND_ACTIVE',
	],
	heading: [
		'MOBILE_TEXT_HEADING_PRIMARY',
		'USER_PROFILE_ABOUT_ME_HEADING_TEXT',
	],
	strong: [
		'TEXT_STRONG',
		'INPUT_TEXT_DEFAULT',
		'INTERACTIVE_TEXT_HOVER',
		'INTERACTIVE_TEXT_ACTIVE',
		'REDESIGN_CHANNEL_NAME_TEXT',
		'TAB_LABEL_TEXT_FOCUSED',
		'ICON_STRONG',
		'INTERACTIVE_ICON_HOVER',
		'INTERACTIVE_ICON_ACTIVE',
		'MOBILE_HEADER_ICON_DEFAULT',
		'NAVIGATOR_HEADER_TINT',
		'CHAT_INPUT_ACTION_ICON_ACTIVE_TINT',
		'CONTROL_ICON_ONLY_ICON_ACTIVE',
		'CONTROL_SECONDARY_TEXT_DEFAULT',
	],
	text: ['TEXT_DEFAULT', 'ICON_DEFAULT', 'REDESIGN_BUTTON_TERTIARY_TEXT'],
	subtle: [
		'TEXT_SUBTLE',
		'INTERACTIVE_TEXT_DEFAULT',
		'MESSAGES_ITEM_CHANNEL_TEXT_DEFAULT',
		'TAB_LABEL_TEXT_DEFAULT',
		'MOBILE_UNREADBAR_TEXT_DEFAULT',
		'REDESIGN_BUTTON_TERTIARY_PRESSED_TEXT',
		'ICON_SUBTLE',
		'INTERACTIVE_ICON_DEFAULT',
		'MOBILE_GUILDBAR_ICON_DEFAULT',
		'CHAT_INPUT_ICON_DEFAULT_TINT',
		'CHAT_INPUT_ACTION_BUTTON_ICON_DEFAULT_TINT',
		'CONTROL_ICON_ONLY_ICON_DEFAULT',
		'INPUT_ICON_DEFAULT',
		'REACTION_TEXT_DEFAULT',
		'SWITCH_THUMB_BACKGROUND_DEFAULT',
	],
	muted: [
		'TEXT_MUTED',
		'INPUT_PLACEHOLDER_TEXT_DEFAULT',
		'REDESIGN_CHANNEL_NAME_MUTED_TEXT',
		'CHANNELS_DEFAULT',
		'ICON_MUTED',
		'CHECKBOX_BORDER_DEFAULT',
		'RADIO_BORDER_DEFAULT',
	],
	faint: ['CHANNEL_ICON'],
	divider: [
		'BORDER_SUBTLE',
		'CHAT_BORDER',
		'MOBILE_COMMAND_BAR_DIVIDER',
		'STANDALONE_CHANNEL_HEADER_BORDER',
	],
	border: [
		'APP_FRAME_BORDER',
		'BORDER_MUTED',
		'BORDER_NORMAL',
		'CARD_BORDER_DEFAULT',
		'MOBILE_HEADER_BORDER',
		'MOBILE_COACHMARK_BORDER_DEFAULT',
		'MOBILE_FLOATING_ACCESSORY_BORDER',
		'MOBILE_CHATINPUT_BORDER_DEFAULT',
		'INPUT_BORDER_DEFAULT',
		'CONTROL_SECONDARY_BORDER_DEFAULT',
		'SWITCH_BORDER_DEFAULT',
		'REACTION_BORDER_DEFAULT',
	],
	borderStrong: [
		'BORDER_STRONG',
		'MOBILE_CHATINPUT_BORDER_ACTIVE',
		'CONTROL_SECONDARY_BORDER_ACTIVE',
		'SLIDER_TRACK_BACKGROUND',
	],
	accent: [
		'CHAT_INPUT_SEND_BUTTON_ACTIVE_BACKGROUND',
		'INPUT_BORDER_ACTIVE',
		'BORDER_FOCUS',
		'CONTROL_PRIMARY_BACKGROUND_DEFAULT',
		'INTERACTIVE_ACCENT_BACKGROUND_SELECTED',
		'TOGGLEBUTTON_BORDER_SELECTED',
		'SWITCH_BACKGROUND_SELECTED_DEFAULT',
		'SWITCH_BORDER_SELECTED_DEFAULT',
		'SWITCH_THUMB_ICON_ACTIVE',
		'CHECKBOX_BORDER_SELECTED_DEFAULT',
		'CHECKBOX_BACKGROUND_SELECTED_DEFAULT',
		'REDESIGN_INPUT_CONTROL_SELECTED',
		'PROGRESSBAR_INDICATOR_BACKGROUND',
		'ACTIVITY_TIMEBAR_PROGRESS_BACKGROUND',
		'REACTION_BORDER_REACTED_DEFAULT',
	],
	accentPress: [
		'CONTROL_PRIMARY_BACKGROUND_ACTIVE',
		'INTERACTIVE_ACCENT_BACKGROUND_ACTIVE',
	],
	onAccent: [
		'CHAT_INPUT_SEND_BUTTON_ICON_ACTIVE_TINT',
		'CONTROL_PRIMARY_TEXT_DEFAULT',
		'SWITCH_THUMB_BACKGROUND_SELECTED_DEFAULT',
		'CHECKBOX_ICON_ACTIVE',
	],
	accentSoft: [
		'TOGGLEBUTTON_BACKGROUND_SELECTED',
		'REACTION_BACKGROUND_REACTED_DEFAULT',
		'POLLS_VOTED_FILL',
	],
	accentText: [
		'TEXT_BRAND',
		'CONTROL_BRAND_FOREGROUND',
		'CONTROL_BRAND_FOREGROUND_NEW',
		'ICON_BRAND',
		'REACTION_TEXT_REACTED_DEFAULT',
	],
	brand: ['BACKGROUND_BRAND'],
	rowIcon: ['TABLEROW_ICON_COLOR_DEFAULT'],
	selection: [
		'GUILD_FOLDER_BACKGROUND',
		'INTERACTIVE_BACKGROUND_ACTIVE',
		'INTERACTIVE_BACKGROUND_SELECTED',
		'MOBILE_CHANNEL_ITEM_BACKGROUND_SELECTED',
	],
	link: ['TEXT_LINK'],
	mentionText: ['MENTION_FOREGROUND'],
	mentionPill: ['MENTION_BACKGROUND'],
	mentionBg: [
		'MESSAGE_MENTIONED_BACKGROUND_DEFAULT',
		'MESSAGE_MENTIONED_BACKGROUND_HOVER',
	],
	replyBg: [
		'MESSAGE_HIGHLIGHT_BACKGROUND_DEFAULT',
		'MESSAGE_HIGHLIGHT_BACKGROUND_HOVER',
	],
	keyword: ['KEYWORD_HIGHLIGHT_BACKGROUND'],
	code: ['BACKGROUND_CODE'],
	codeText: ['TEXT_CODE'],
	spoiler: ['SPOILER_HIDDEN_BACKGROUND'],
	spoilerRevealed: ['SPOILER_REVEALED_BACKGROUND'],
	positive: [
		'TEXT_FEEDBACK_POSITIVE',
		'ICON_FEEDBACK_POSITIVE',
		'STATUS_POSITIVE',
	],
	warning: ['TEXT_FEEDBACK_WARNING', 'ICON_FEEDBACK_WARNING', 'STATUS_WARNING'],
	danger: [
		'TEXT_FEEDBACK_CRITICAL',
		'ICON_FEEDBACK_CRITICAL',
		'STATUS_DANGER',
		'CONTROL_CRITICAL_SECONDARY_TEXT_DEFAULT',
		'MOBILE_CHAT_NEW_MESSAGE_TEXT',
		'MOBILE_CHAT_NEW_MESSAGE_BORDER',
	],
	dangerFill: [
		'CONTROL_CRITICAL_PRIMARY_BACKGROUND_DEFAULT',
		'BACKGROUND_FEEDBACK_NOTIFICATION',
	],
	scrim: ['BACKGROUND_SCRIM', 'CONTEXT_MENU_BACKDROP_BACKGROUND'],
}

const SOLID: Partial<Record<Role, string[]>> = {
	card: [
		'CARD_BACKGROUND_DEFAULT',
		'CARD_MUTED_BG',
		'CARD_SECONDARY_BG',
		'CARD_SECONDARY_BACKGROUND_DEFAULT',
		'TABLEROW_BACKGROUND_DEFAULT',
		'BACKGROUND_APP_LAUNCHER_CARD_DEFAULT',
		'BACKGROUND_APP_LAUNCHER_ROW_DEFAULT',
	],
	control: ['MOBILE_EMOJI_BUTTON_BACKGROUND'],
	pressed: [
		'CARD_MUTED_PRESSED_BG',
		'CARD_PRIMARY_PRESSED_BG',
		'CARD_SECONDARY_PRESSED_BG',
		'CARD_SECONDARY_BACKGROUND_ACTIVE',
		'TABLEROW_BACKGROUND_PRESSED',
	],
}

const FADED: [Role, string, string[]][] = [
	['page', 'f5', ['BLUR_FALLBACK', 'THEME_LOCKED_BLUR_FALLBACK']],
	['pressed', 'f5', ['BLUR_FALLBACK_PRESSED']],
	['popup', 'f9', ['LEGACY_BLUR_FALLBACK_DEFAULT']],
	['popup', '80', ['LEGACY_ANDROID_BLUR_OVERLAY_DEFAULT']],
]

export function paint(p: Palette): Record<string, string> {
	const out: Record<string, string> = {}
	for (const role of Object.keys(PLAIN) as Role[])
		for (const key of PLAIN[role]) out[key] = p[role]
	for (const role of Object.keys(SOLID) as Role[])
		for (const key of SOLID[role]!) out[key] = opaque(p[role])
	for (const [role, alpha, keys] of FADED)
		for (const key of keys) out[key] = withAlpha(p[role], alpha)

	for (const key of ['SPINE_DEFAULT', 'THREAD_CHANNEL_SPINE'])
		out[key] = over(p.borderStrong, p.panel)
	return out
}

type Base = 'dark' | 'darker' | 'light' | 'midnight'

export function themeColors(
	discord: { raw: Record<string, string> },
	tone: Tone,
	looks: Partial<Record<Base, Look>>,
): ThemeColors {
	const recolour = toneMapper(tone)
	const semantic: NonNullable<ThemeColors['semantic']> = {}
	for (const base of Object.keys(looks) as Base[]) {
		const look = looks[base]!
		const stock = base === 'light' ? LightColors : AshColors
		const recolourLook = look.tone ? toneMapper(look.tone) : recolour
		const colors: Record<string, string> = {}
		for (const key of Object.keys(stock))
			colors[key] = recolourLook(stock[key]!)
		semantic[base] = { ...colors, ...paint(look.palette), ...look.extra }
	}
	const raw: Record<string, string> = {}
	for (const key of Object.keys(discord.raw))
		raw[key] = recolour(discord.raw[key]!)
	return { raw, semantic }
}

export function lazyColors(tone: Tone, looks: Partial<Record<Base, Look>>) {
	let built: ThemeColors | undefined
	return (discord: { raw: Record<string, string> }) =>
		(built ??= themeColors(discord, tone, looks))
}
