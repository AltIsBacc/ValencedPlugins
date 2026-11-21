import Page from '@valenced/components/Page'
import type { JsonStorage } from '@valenced/json-storage'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { OwnProfileStorage } from '#shared/own-profile-theme'

type Props = ComponentProps<
	PluginSettingsComponent<{ jsonStorage: OwnProfileStorage }>
>

export function OwnProfileSwitch({
	storage,
}: {
	storage: JsonStorage<OwnProfileStorage>
}) {
	const { TableRowGroup, TableSwitchRow } = valenced.discord.design.Design
	const enabled = storage.use()?.themeOwnProfile !== false

	const update = (themeOwnProfile: boolean) =>
		storage.set({ ...storage.cache, themeOwnProfile })

	return (
		<TableRowGroup title="Your profile">
			<TableSwitchRow
				label="Use theme on my profile"
				subLabel="Paints your You page with this theme. Turn it off to see your own profile theme instead."
				value={enabled}
				onValueChange={update}
			/>
		</TableRowGroup>
	)
}

export function OwnProfileSettings({ api }: Props) {
	return (
		<Page>
			<OwnProfileSwitch storage={api.jsonStorage} />
		</Page>
	)
}
