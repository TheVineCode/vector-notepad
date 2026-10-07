# Vector Notepad

A private, single-user, self-hosted notepad designed for local keyword and semantic retrieval. SQLite is the source of truth; Chroma will be a rebuildable semantic index. Note text must stay local.

## Current Status

The npm workspace contains a NestJS API in `apps/api`. It supports creating body-only notes and listing the 20 most recently updated active notes. Notes and pending semantic-index work are committed together in SQLite.

Semantic indexing, search, editing, Trash, the React frontend, and Docker Compose deployment are not implemented yet. Pending index work is stored but has no worker to process it. See `project-doc.md` for the agreed milestone and architectural direction.

## Development

Run these commands from the repository root with Node.js and npm installed:

```sh
npm ci
npm run start:dev
```

The API binds to `127.0.0.1:3000` by default. `HOST` and `PORT` override the bind address and port. There is no authentication; keep the API bound to localhost.

SQLite migrations run automatically when the API starts. Through the workspace scripts, the default database is `data/sqlite/notes.sqlite` at the repository root. `VECTOR_NOTEPAD_DATA_ROOT` overrides the data directory; `SQLITE_PATH` overrides the complete database path. Prefer absolute paths for overrides. The default `data/` directory is Git-ignored.

## API

| Route                | Behavior                                              |
| -------------------- | ----------------------------------------------------- |
| `POST /api/notes`    | Create a note from a JSON object with a `body` string |
| `GET /api/notes`     | List up to 20 recently updated active notes           |
| `GET /api/docs`      | Interactive OpenAPI documentation                     |
| `GET /api/docs-json` | OpenAPI JSON document                                 |

Example create request:

```json
{ "body": "Remember to review the local indexing pipeline." }
```

Accepted text is preserved as entered. Whitespace-only or non-string bodies are rejected. JSON requests are limited to 1 MiB. Saving does not require Chroma or an embedding model.

## Verification

```sh
npm run build
npm test
npm run test:e2e
```

Unit and SQLite integration tests run through `npm test`; HTTP end-to-end tests run through `npm run test:e2e`. Current tests do not require Chroma.

After building, `npm run start:prod` starts the compiled API. This is not yet the planned production Compose deployment.

## Contributing

Read `AGENTS.md` before making changes. Work is tracked in small GitHub issues before implementation and delivered through task-scoped PRs.

## License

See `LICENSE`.
