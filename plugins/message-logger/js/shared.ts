export interface Settings {
	logDeletes: boolean
	logEdits: boolean
	ignoreSelf: boolean
	ignoreBots: boolean
	blacklistedUserIds: string[]
}

export const DefaultSettings: Settings = {
	logDeletes: true,
	logEdits: true,
	ignoreSelf: false,
	ignoreBots: false,
	blacklistedUserIds: [],
}

export const UserIdPattern = /^\d{15,25}$/
