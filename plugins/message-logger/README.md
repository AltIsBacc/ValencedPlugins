# Message Logger

Keeps deleted messages, removed attachments, and edit history in chat, and records them in a SQLite database (`msglogger.db`).

## Settings

- Deleted messages, edits
- Ignore your own messages, bots
- User ID blacklist: messages from these users are never logged
- Export database: saves a copy of `msglogger.db` to your Downloads folder

## Querying with Drizzle Studio

Export the database from the plugin settings, move it to your computer, then from the repository root:

```sh
bun run msglogger:studio path/to/msglogger-<timestamp>.db
```

Drizzle Studio opens at https://local.drizzle.studio.

## Tables

- `messages`: logged messages, with `deleted` and `deleted_at` set for deleted ones
- `edits`: previous versions of edited messages
- `attachments`: attachments of deleted messages and removed attachments of edited ones
