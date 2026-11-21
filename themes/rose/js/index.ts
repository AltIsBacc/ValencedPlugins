/// <reference types="@valenced/themes-api" />

import { OwnProfileSettings } from '../../../shared/own-profile-setting'
import { themeOwnProfile } from '../../../shared/own-profile-theme'
import type { OwnProfileStorage } from '../../../shared/own-profile-theme'
import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

const tone: Tone = {
	greys: [
		['#000000', '#0e080a'],
		['#28282d', '#140c0f'],
		['#2c2d32', '#150d10'],
		['#323339', '#1a1215'],
		['#393a41', '#241a1f'],
		['#41434a', '#2a1f24'],
		['#595a63', '#4a343d'],
		['#81828a', '#8a6677'],
		['#97979f', '#a08090'],
		['#abacb2', '#b8959e'],
		['#c5c6ca', '#d6b8c2'],
		['#efeff1', '#f1dde4'],
		['#f3f3f4', '#f5e6ea'],
		['#fbfbfb', '#fff0f5'],
		['#ffffff', '#fff5f8'],
	],
	hues: {
		red: '#e0354f',
		orange: '#f0805e',
		yellow: '#f2b560',
		green: '#4fb58a',
		teal: '#5fb8a8',

		blue: '#ff8fab',
		blurple: '#ee7fa0',
		purple: '#c77dba',
		pink: '#ff6090',
	},
}

const rosewood: Palette = {
	rail: '#140c0f',
	floor: '#1a1215',
	panel: '#1e1519',
	page: '#1a1215',
	card: '#2a1f24',
	popup: '#2a1f24',
	input: '#2a1f24',
	control: '#33252c',
	pressed: '#3d2b33',

	heading: '#fff0f5',
	strong: '#f8e9ee',
	text: '#f5e6ea',
	subtle: '#d6b8c2',
	muted: '#b8959e',
	faint: '#8a6677',

	divider: '#3d2b33',
	border: '#4a343d',
	borderStrong: '#5e4350',

	accent: '#ee7fa0',
	accentPress: '#e0668b',
	onAccent: '#2a0f1a',
	accentSoft: '#ee7fa040',
	accentText: '#ff8fab',
	brand: '#e0527e',
	rowIcon: '#f2a3bb',
	selection: '#ee7fa02b',

	link: '#ff8fab',
	mentionText: '#ffd6e4',
	mentionPill: '#ff60904d',
	mentionBg: '#ff609014',
	replyBg: '#e8a0b414',
	keyword: '#ff609033',
	code: '#140c0f',
	codeText: '#f5e6ea',
	spoiler: '#3d2b33',
	spoilerRevealed: '#2a1f24',

	positive: '#7fd6a6',
	warning: '#f2c36b',
	danger: '#ff6b81',
	dangerFill: '#e0354f',
	scrim: '#0e080acc',
}

const amoled: Palette = {
	...rosewood,
	rail: '#000000',
	floor: '#000000',
	panel: '#000000',
	page: '#000000',
	card: '#0f0709',
	popup: '#0f0709',
	input: '#150b11',
	control: '#1a0d14',
	pressed: '#22121b',

	divider: '#2a1420',
	border: '#3b2330',
	borderStrong: '#52303f',

	accent: '#ff6090',
	accentPress: '#f0507f',
	accentSoft: '#ff609040',
	selection: '#ff60902b',

	code: '#0a0407',
	spoiler: '#2a1420',
	spoilerRevealed: '#140a0f',
	scrim: '#000000d9',
}

const blush: Palette = {
	rail: '#ffdce9',
	floor: '#fff5f9',
	panel: '#ffe9f1',
	page: '#fff5f9',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#ffe3ee',
	control: '#ffd6e6',
	pressed: '#ffc9de',

	heading: '#4a1830',
	strong: '#4a1830',
	text: '#5a2640',
	subtle: '#7a3a58',
	muted: '#a0607f',
	faint: '#c08aa3',

	divider: '#7a3a581f',
	border: '#7a3a5833',
	borderStrong: '#7a3a5873',

	accent: '#d6307f',
	accentPress: '#b82a6e',
	onAccent: '#ffffff',
	accentSoft: '#d6307f26',
	accentText: '#c2256f',
	brand: '#e0527e',
	rowIcon: '#c2256f',
	selection: '#d6307f1f',

	link: '#c2256f',
	mentionText: '#a8185c',
	mentionPill: '#ff609040',
	mentionBg: '#ff60900f',
	replyBg: '#d6307f12',
	keyword: '#ff609033',
	code: '#ffe9f1',
	codeText: '#5a2640',
	spoiler: '#f2b8d0',
	spoilerRevealed: '#ffe3ee',

	positive: '#1f8a52',
	warning: '#a87a12',
	danger: '#d6304f',
	dangerFill: '#d6304f',
	scrim: '#4a183059',
}

const dark: Look = {
	palette: rosewood,
	extra: {
		CONTROL_PRIMARY_BORDER_DEFAULT: '#ffffff1f',
	},
}

const black: Look = {
	palette: amoled,
	extra: {
		CONTROL_PRIMARY_BORDER_DEFAULT: '#ffffff1f',
		MOBILE_BACKGROUND_SCRIM_OPAQUE: '#000000',
		BACKGROUND_SCRIM_LIGHTBOX: '#000000f2',
		OVERLAY_BACKDROP_LIGHTBOX: '#000000f2',
	},
}

const light: Look = {
	palette: blush,
	extra: {
		CONTROL_PRIMARY_BORDER_DEFAULT: '#7a3a5833',
	},
}

export default plugin<{ jsonStorage: OwnProfileStorage }>({
	jsonStorage: { load: true, default: {} },
	SettingsComponent: OwnProfileSettings,
	start(api) {
		themeOwnProfile(api as never)
	},
	preInit({ themes }) {
		themes.registerGroup('rose', {
			name: 'Rosé',
			description: 'Soft rose pink with dark, light and AMOLED variants.',
		})
		themes.registerTheme('rose', 'rose', {
			name: 'Rosé',
			description:
				'Rose gold surfaces with cherry blossom accents, a blush Light and a pure black AMOLED.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: black,
				light,
			}),
		})
	},
})
