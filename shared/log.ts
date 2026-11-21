export interface Logger {
	log(...args: unknown[]): void
	warn(...args: unknown[]): void
	error(...args: unknown[]): void
}

export function createLogger(tag: string): Logger {
	const prefix = `[${tag}]`

	return {
		log: (...args) => console.log(prefix, ...args),
		warn: (...args) => console.warn(prefix, ...args),
		error: (...args) => console.error(prefix, ...args),
	}
}
