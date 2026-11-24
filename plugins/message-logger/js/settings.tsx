import { getAssetIdByName } from '@valenced/assets'
import Page from '@valenced/components/Page'
import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import { ToastActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { exportDatabase } from './native'
import { DefaultSettings, UserIdPattern } from './shared'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { Settings } from './shared'

const {
	Button,
	IconButton,
	Stack,
	TableRow,
	TableRowGroup,
	TableSwitchRow,
	TextInput,
} = Design

type Props = ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>

export default function SettingsComponent({
	api: { jsonStorage: storage },
}: Props) {
	const setting = <K extends keyof Settings>(key: K): Settings[K] =>
		storage.use(x => key in x)?.[key] ?? DefaultSettings[key]

	const logDeletes = setting('logDeletes')
	const logEdits = setting('logEdits')
	const ignoreSelf = setting('ignoreSelf')
	const ignoreBots = setting('ignoreBots')
	const blacklist = setting('blacklistedUserIds')

	const [userId, setUserId] = useState('')
	const [exporting, setExporting] = useState(false)

	const id = userId.trim()
	const invalid = id !== '' && !UserIdPattern.test(id)
	const canAdd = id !== '' && !invalid && !blacklist.includes(id)

	const setBlacklist = (blacklistedUserIds: string[]) =>
		storage.set(
			{
				...DefaultSettings,
				...(storage.cache as Partial<Settings> | undefined),
				blacklistedUserIds,
			},
			true,
		)

	const addUser = () => {
		if (!canAdd) return
		setBlacklist([...blacklist, id])
		setUserId('')
	}

	const runExport = () => {
		setExporting(true)
		exportDatabase()
			.then(
				location =>
					ToastActionCreators.open('MESSAGE_LOGGER_EXPORT', {
						text: `Saved to ${location}`,
						variant: 'success',
					}),
				error =>
					ToastActionCreators.open('MESSAGE_LOGGER_EXPORT', {
						text:
							error instanceof Error
								? error.message
								: 'Unable to export the database.',
						variant: 'critical',
					}),
			)
			.finally(() => setExporting(false))
	}

	return (
		<Page>
			<ScrollView>
				<Stack spacing={24}>
					<TableRowGroup title="Log">
						<TableSwitchRow
							icon={<TableRowAssetIcon name="TrashIcon" />}
							label="Deleted messages"
							subLabel="Keep deleted messages and attachments in chat, and removed attachments of edited messages."
							value={logDeletes}
							onValueChange={logDeletes => storage.set({ logDeletes })}
						/>
						<TableSwitchRow
							icon={<TableRowAssetIcon name="PencilIcon" />}
							label="Edits"
							subLabel="Show previous versions of edited messages."
							value={logEdits}
							onValueChange={logEdits => storage.set({ logEdits })}
						/>
					</TableRowGroup>
					<TableRowGroup title="Ignore">
						<TableSwitchRow
							icon={<TableRowAssetIcon name="UserIcon" />}
							label="Your messages"
							value={ignoreSelf}
							onValueChange={ignoreSelf => storage.set({ ignoreSelf })}
						/>
						<TableSwitchRow
							icon={<TableRowAssetIcon name="RobotIcon" />}
							label="Bots"
							value={ignoreBots}
							onValueChange={ignoreBots => storage.set({ ignoreBots })}
						/>
					</TableRowGroup>
					<Stack spacing={12}>
						<TableRowGroup
							title="Blacklist"
							description="Messages from these users are never logged."
						>
							{!blacklist.length && (
								<TableRow label="No users blacklisted" disabled />
							)}
							{blacklist.map(blocked => (
								<TableRow
									key={blocked}
									icon={<TableRowAssetIcon name="DenyIcon" />}
									label={blocked}
									trailing={
										<IconButton
											icon={getAssetIdByName('TrashIcon')!}
											onPress={() =>
												setBlacklist(
													blacklist.filter(entry => entry !== blocked),
												)
											}
											size="sm"
											variant="destructive"
										/>
									}
								/>
							))}
						</TableRowGroup>
						<TextInput
							label="User ID"
							placeholder="Enter a user ID to blacklist"
							value={userId}
							onChange={setUserId}
							status={invalid ? 'error' : 'default'}
							errorMessage={invalid ? 'Enter a numeric user ID.' : undefined}
							size="md"
						/>
						<Button
							text="Blacklist user"
							variant="primary"
							disabled={!canAdd}
							onPress={addUser}
						/>
					</Stack>
					<TableRowGroup
						title="Database"
						description="Logs are saved to msglogger.db. Export a copy to open it in Drizzle Studio."
					>
						<TableRow
							icon={<TableRowAssetIcon name="FileIcon" />}
							label="Export database"
							subLabel="Saves a copy of msglogger.db to your Downloads folder."
							disabled={exporting}
							onPress={runExport}
						/>
					</TableRowGroup>
				</Stack>
			</ScrollView>
		</Page>
	)
}
