export const migrations: string[][] = [
	[
		"CREATE TABLE `messages` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`channel_id` text NOT NULL,\n\t`guild_id` text,\n\t`author_id` text NOT NULL,\n\t`author_name` text,\n\t`author_bot` integer NOT NULL,\n\t`content` text DEFAULT '' NOT NULL,\n\t`deleted` integer NOT NULL,\n\t`deleted_at` integer,\n\t`logged_at` integer NOT NULL\n)",
		'CREATE INDEX `messages_channel_id_idx` ON `messages` (`channel_id`)',
		'CREATE INDEX `messages_author_id_idx` ON `messages` (`author_id`)',
		'CREATE TABLE `edits` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`message_id` text NOT NULL,\n\t`content` text NOT NULL,\n\t`edited_at` integer NOT NULL,\n\tFOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade\n)',
		'CREATE INDEX `edits_message_id_idx` ON `edits` (`message_id`)',
		'CREATE TABLE `attachments` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`message_id` text NOT NULL,\n\t`filename` text,\n\t`url` text,\n\t`size` integer,\n\t`content_type` text,\n\t`removed` integer NOT NULL,\n\tFOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade\n)',
		'CREATE INDEX `attachments_message_id_idx` ON `attachments` (`message_id`)',
	],
]
