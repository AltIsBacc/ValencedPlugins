import type { PluginApi } from '@valenced/plugins/types'
import type { ThemesState } from '@valenced/themes-api/types'
import type { ComponentType, Context, ElementType, Key } from 'react'

interface DisplayProfile {
	userId: string
	primaryColor: number | null
	hasThemeColors(): boolean
	getPreviewThemeColors(pending?: unknown): number[] | null | undefined
}

interface TokenModule {
	RawColor: unknown
	SemanticColor: unknown
	default: {
		colors: Record<string, object>
		internal: {
			resolveSemanticColor(theme: string, color: object): string
		}
	}
}

interface ThemeContextModule {
	RootThemeContextProvider(props: unknown): unknown
	DisableCustomTheme: unknown
}

type Gradient = [top: number, bottom: number]

export interface OwnProfileStorage {
	themeOwnProfile?: boolean
}

const YOU_SCREEN_FLAG = Symbol.for('thatmg393.dev.theme.onYouScreen')

const GRADIENT_KEYS = [
	'BACKGROUND_BASE_LOWER',
	'BACKGROUND_BASE_LOWEST',
] as const

export function themeOwnProfile(api: PluginApi) {
	const { cleanup, plugin, unscoped } = api
	const { modules, patcher, react, discord } = unscoped
	const { finders, native } = modules
	const { withName, withProps } = finders.filters
	const { React } = react

	const settings = (
		api as { jsonStorage?: { cache?: OwnProfileStorage | null } }
	).jsonStorage
	const { ThemeStore, UserStore } = discord.flux.Stores as unknown as {
		ThemeStore: { theme: string }
		UserStore: { getCurrentUser(): { id: string } | undefined }
	}

	const registry = globalThis as unknown as Record<
		symbol,
		Context<boolean> | undefined
	>
	const InYouScreen = (registry[YOU_SCREEN_FLAG] ??= React.createContext(false))

	const readThemeState = (): ThemesState =>
		JSON.parse(native.callNativeMethodSync('valenced.themes.getState', []))

	let themeState = readThemeState()
	let tokens: TokenModule | undefined
	let active = true
	cleanup(() => {
		active = false
	})

	function themeGradient(): Gradient | null {
		if (themeState.colors?.plugin !== plugin.manifest.id || !tokens) return null
		const { colors, internal } = tokens.default
		const [top, bottom] = GRADIENT_KEYS.map(key =>
			Number.parseInt(
				internal
					.resolveSemanticColor(ThemeStore.theme, colors[key]!)
					.slice(1, 7),
				16,
			),
		)
		return Number.isFinite(top) && Number.isFinite(bottom)
			? [top!, bottom!]
			: null
	}

	function insideYouScreen() {
		try {
			return Boolean(React.use(InYouScreen))
		} catch {
			return false
		}
	}

	function replacement(profile: DisplayProfile): Gradient | null {
		if (!active || settings?.cache?.themeOwnProfile === false) return null
		if (profile.userId !== UserStore.getCurrentUser()?.id) return null
		if (!insideYouScreen()) return null

		return themeGradient()
	}

	function watchTokens(module: TokenModule) {
		tokens = module
	}

	function watchThemeSelection(module: ThemeContextModule) {
		cleanup(
			patcher.before(module, 'RootThemeContextProvider', args => {
				themeState = readThemeState()
				return args
			}),
		)
	}

	function flagYouScreen(YouScreen: ComponentType<object>) {
		cleanup(
			react.jsxRuntime.insteadJSX(YouScreen, (args, jsx) => {
				if (!active) return jsx(...args)
				const [type, props, key] = args as [
					ElementType,
					object,
					Key | undefined,
				]
				return jsx(
					InYouScreen.Provider,
					{ value: true, children: jsx(type, props) },
					key,
				)
			}),
		)
	}

	function overrideProfile(Profile: new (...args: never[]) => DisplayProfile) {
		const proto = Profile.prototype

		const descriptor = Object.getOwnPropertyDescriptor(proto, 'primaryColor')
		if (descriptor?.get) {
			const stock = descriptor.get
			const getter = function (this: DisplayProfile) {
				return replacement(this)?.[0] ?? stock.call(this)
			}
			Object.defineProperty(proto, 'primaryColor', {
				...descriptor,
				get: getter,
			})
			cleanup(() => {
				const current = Object.getOwnPropertyDescriptor(proto, 'primaryColor')
				if (current?.get === getter)
					Object.defineProperty(proto, 'primaryColor', descriptor)
			})
		}

		cleanup(
			patcher.instead(proto, 'hasThemeColors', function (args, original) {
				return replacement(this as DisplayProfile)
					? true
					: Reflect.apply(original, this, args)
			}),
			patcher.instead(
				proto,
				'getPreviewThemeColors',
				function (args, original) {
					const colors =
						args[0] == null ? replacement(this as DisplayProfile) : null
					return colors ? [...colors] : Reflect.apply(original, this, args)
				},
			),
		)
	}

	cleanup(
		finders.getModules(
			withProps<TokenModule>('RawColor', 'SemanticColor'),
			watchTokens,
			{ cached: true },
		),
		finders.getModules(
			withProps<ThemeContextModule>(
				'RootThemeContextProvider',
				'DisableCustomTheme',
			),
			watchThemeSelection,
			{ cached: true },
		),
		finders.getModules(
			withName<ComponentType<object>>('YouScreen'),
			flagYouScreen,
			{
				cached: true,
			},
		),
		finders.getModules(
			withName<new (...args: never[]) => DisplayProfile>('DisplayProfile'),
			overrideProfile,
			{ cached: true },
		),
	)
}
