# Vector Notepad Project Overview

## Document purpose

This document is the implementation handoff for Vector Notepad. It records the product and architecture decisions agreed during design so another agent can continue without repeating discovery or product interviews.

Status: **design agreed; implementation intentionally not started**.

The original seed idea and early Chroma notes remain in `doc/plan.md`. This document supersedes that file as the detailed product and implementation direction.

## Read before working

- Read `AGENTS.md` for repository-specific agent guidance.
- Read `docs/agents/issue-tracker.md` before publishing tickets or specs.
- Read `docs/agents/triage-labels.md` before applying issue labels.
- Read `docs/agents/domain.md` before adding glossary entries or ADRs.
- Preserve unrelated worktree changes. At the time of this handoff, the agent configuration files and this document may still be uncommitted.

## Current repository state

The repository is effectively an unmodified NestJS 11 starter.

- The only API is `GET /`, returning `Hello World!`.
- There is no note domain model, persistence, Chroma integration, application UI, authentication, or Docker Compose configuration.
- `chromadb` and `@chroma-core/default-embed` are installed but unused.
- Existing tests cover only the NestJS starter response.
- The planned workspace conversion has not happened yet.

Do not treat the current starter structure as an architectural commitment. The agreed structure is described below.

## Product vision

Vector Notepad is a private, single-user, self-hosted notepad. Its core job is to make accumulated notes useful by retrieving them without requiring the user to maintain folders or another organizational system.

The first milestone should feel deliberately small:

- One editor for capturing or editing a note.
- One search input for retrieving notes.
- A ranked result list that opens notes for editing.
- A separate Trash view.

The value proposition is retrieval, not AI-generated prose. The application returns inspectable source notes rather than generated answers.

## Product constraints

- Single user.
- Self-hosted through Docker Compose.
- Reachable only from the host through `localhost`.
- Fully local note processing at runtime.
- No note text may be sent to an external inference API.
- Runtime must work without internet access.
- Docker image builds may download a pinned embedding model.
- SQLite is the canonical source of truth.
- Chroma is a disposable and rebuildable semantic index.

## First milestone scope

### Included

- Create body-only notes.
- Show the 20 most recently updated notes when the search input is empty.
- Search notes using hybrid keyword and semantic retrieval.
- Return the top 20 deduplicated note results.
- Open a search result in the editor.
- Edit notes with optimistic concurrency protection.
- Move notes to Trash.
- Restore notes from Trash.
- Permanently delete notes after confirmation.
- Display semantic indexing state on the selected note.
- Retry failed indexing automatically and manually.
- Run the complete application through development and production Docker Compose configurations.

### Explicitly excluded

- Authentication.
- Access from the LAN, a VPN, or the public internet.
- Multiple users or tenants.
- Titles, tags, and user-defined metadata.
- Folders.
- Rich-text editing or Markdown rendering.
- Generated answers, chat, or retrieval-augmented generation.
- Import and export.
- Note revision history beyond Trash and restore.
- PWA behavior or offline browser caching.
- User-facing search tuning controls.

## Note behavior

### Content

- A note contains body text only in milestone one.
- Store the body as opaque UTF-8 text.
- Preserve line breaks and Markdown-like characters without rendering them.
- Reject whitespace-only notes.
- Allow duplicate note bodies.
- Limit request bodies to 1 MiB.
- Keep the schema evolvable so title, tags, and metadata can be added later, but do not add those fields prematurely.

### Identity and timestamps

Each note needs a stable identifier, creation timestamp, update timestamp, optimistic-concurrency version, and nullable deletion timestamp. The exact identifier format is an implementation-level choice that was not specified during design.

Store and exchange timestamps consistently in UTC.

### Editing

- The editor has clearly visible New and Edit modes.
- New notes save through a button or `Ctrl+Enter`/`Cmd+Enter`.
- After a successful create, clear the editor and return focus to it.
- Edit mode provides Save, Cancel, and Move to Trash actions.
- Warn before selecting another note if the editor contains unsaved changes.
- Updates include the version that was loaded.
- Reject stale updates as conflicts rather than silently applying last-write-wins behavior.
- On conflict, preserve the local draft and offer Reload or deliberate Overwrite actions.

### Trash

- Trash is a separate view.
- Trashed notes do not appear in normal recent-note lists or search results.
- Notes remain in Trash indefinitely; there is no automatic purge.
- Restore makes a note active again and enqueues semantic reindexing.
- Permanent deletion requires confirmation.
- Permanent deletion must enqueue durable vector removal even if Chroma is unavailable.

## User interface

The frontend is a separate React/Vite application.

- Target desktop first, while remaining usable on mobile screen sizes.
- Use one editor that switches between New and Edit modes.
- Provide a separate search input.
- Search both after a short typing debounce and on explicit submission.
- An empty query shows the 20 most recently updated active notes.
- Search results show the best matching excerpt and update timestamp.
- Selecting a result loads the complete note into Edit mode.
- The selected note shows a subtle semantic-index state.
- Repeated index failures expose a manual Retry action.
- Keep styling and interaction focused on fast capture and retrieval rather than dashboard-like administration.

## Target repository structure

Convert the repository to npm workspaces while implementation is still small.

```text
/
|-- apps/
|   |-- api/       # NestJS application
|   `-- web/       # React/Vite application
|-- data/          # Git-ignored host data by default
|   |-- sqlite/
|   `-- chroma/
|-- docs/
|-- docker-compose.yml
|-- docker-compose.dev.yml
|-- package.json
`-- project-doc.md
```

The exact Compose filenames may follow repository conventions, but development and production behavior must remain distinct.

This remains one domain context even though it contains two application packages. Do not introduce per-package domain glossaries solely because npm workspaces are used.

## Architectural boundaries

Application and domain code must depend on capability-oriented ports rather than vendor APIs.

### `NoteRepository`

Responsibilities:

- Create and retrieve canonical notes.
- List recently updated active notes.
- Update notes with optimistic concurrency.
- Move notes to Trash and restore them.
- Permanently delete notes.
- Produce keyword-search candidates.
- Commit note changes and durable index work atomically.

The first adapter uses SQLite. Do not create a generic database interface; model note-specific operations.

### `SemanticNoteIndex`

Responsibilities:

- Upsert embedded note chunks.
- Remove all chunks belonging to a note.
- Return ranked semantic chunk candidates.
- Build and address versioned collections.
- Support switching the active collection after a successful rebuild.

The first adapter uses Chroma. Chroma documents, metadata, distances, and client types must not leak into application or domain contracts.

### `EmbeddingProvider`

Responsibilities:

- Convert note chunks and search queries into vectors.
- Expose enough model identity to detect incompatible index state.
- Keep one long-lived inference pipeline rather than rebuilding it for each call.

The first adapter uses a pinned `Xenova/all-MiniLM-L6-v2` revision and produces normalized 384-dimensional vectors locally.

### HTTP boundary

- Expose conventional JSON REST endpoints under `/api`.
- Generate OpenAPI documentation from the NestJS API.
- Generate the frontend's typed API client from the OpenAPI document.
- Keep HTTP DTOs separate from domain entities and persistence records.
- Exact endpoint paths, response envelopes, and status-code details remain implementation-level API design work.

## Canonical persistence

Use `better-sqlite3` with explicit SQL migrations.

SQLite should hold at least:

- Canonical note records and optimistic-concurrency versions.
- Trash state.
- FTS5 data needed for keyword retrieval.
- Durable outbox work for semantic upserts and removals.
- Active index configuration and migration state where appropriate.

Use transactions so a canonical note change and its corresponding outbox operation commit together. SQL belongs inside the SQLite adapter; application services should not know about tables, FTS5, or transaction mechanics.

## Semantic indexing and consistency

Semantic indexing is eventually consistent and must never be required for durable capture.

### Write flow

1. Validate the command.
2. Commit the canonical note change and outbox work in one SQLite transaction.
3. Return success once SQLite commits.
4. Process semantic-index work asynchronously.
5. Update observable indexing state after success or failure.

Keyword search can find a newly written note immediately. Semantic search may lag while work is pending.

### Retry behavior

- Retry failed Chroma operations indefinitely.
- Use capped exponential backoff.
- Preserve work across API restarts.
- Record enough error and attempt information to show useful state and diagnose failures.
- Manual Retry resets the delay and makes the work immediately eligible.
- Apply the same durability guarantees to upserts and removals.

The exact backoff timings and worker scheduling mechanism were intentionally not prescribed. Keep them configurable in code and deterministic in tests without adding user-facing controls.

## Chunking

Support both short and long notes.

- Split on paragraph boundaries where possible.
- Combine paragraphs into chunks of approximately 200 model tokens.
- Use a small overlap between neighboring chunks.
- Keep the complete note only in SQLite.
- Associate every vector chunk with its canonical note identifier and chunk location.
- Deduplicate search results by note.
- Use the highest-ranked matching chunk as the displayed excerpt.

The exact overlap size and behavior for a single paragraph longer than the target are implementation details. Use the embedding model's tokenizer rather than character count when enforcing the approximate token target.

## Hybrid search

Hybrid retrieval combines SQLite FTS5 and Chroma without trying to normalize their unrelated raw scores.

### Search algorithm

1. Validate and normalize the user's query without changing its meaning.
2. Retrieve up to 50 keyword candidates from SQLite FTS5.
3. Embed the query locally.
4. Retrieve up to 50 semantic chunk candidates from Chroma.
5. Merge the ranked lists using Reciprocal Rank Fusion with `k = 60`.
6. Deduplicate chunks by canonical note identifier.
7. Keep the best matching excerpt for each note.
8. Return the top 20 notes.

Do not expose weights, candidate limits, or the RRF constant in the UI during milestone one.

Tests should make ranking behavior observable so these defaults can be tuned later using evidence.

## Embedding and index versioning

The API owns embedding generation and sends explicit vectors to Chroma. Do not rely on Chroma's JavaScript client to invoke its default embedding function implicitly.

Record at least:

- Model identifier.
- Pinned model revision.
- Vector dimensions.
- Chunking-policy version.
- Any normalization or distance assumptions required for compatibility.

Changing incompatible embedding or chunking configuration requires a rebuild:

1. Create a new versioned Chroma collection.
2. Re-read every active canonical note from SQLite.
3. Chunk and embed each note under the new configuration.
4. Verify the complete active corpus was indexed.
5. Atomically switch the active collection reference.
6. Retain or clean up the old collection according to a safe operational policy.

Search should continue using the previous complete collection while rebuilding. SQLite remains authoritative if any rebuild fails.

## Deployment

### Containers

The intended production topology contains:

- An Nginx container serving the built React application and proxying `/api`.
- A NestJS API container running SQLite access, background index work, and local embedding inference.
- A Chroma container accessible only on the internal Compose network.

Only the frontend binds to the host, and it must bind to `127.0.0.1`. Do not publish API or Chroma ports in the production configuration.

### Development

- Use a separate development Compose configuration.
- Run Vite with hot reload.
- Support normal NestJS development feedback.
- Chroma still runs in Linux through Docker.

### Offline runtime

- Pin the embedding model revision.
- Download model assets during the API image build.
- Include the required model assets in the resulting image.
- Configure runtime model loading to avoid remote fallback.
- Verify production startup and search with outbound network access unavailable.

### Persistent data

Default host-mounted persistence:

- `./data/sqlite/`
- `./data/chroma/`

Exclude `data/` from Git. Allow an environment variable to override the production host data root.

Copying the complete data root is the agreed first backup mechanism. SQLite is the only authoritative copy; Chroma can be rebuilt if its data is missing or incompatible.

## Testing strategy

Use each layer where it provides distinct confidence.

### Unit tests

- Note validation and state transitions.
- Optimistic-concurrency behavior.
- Paragraph-aware chunking and overlap.
- RRF ranking and note deduplication.
- Retry scheduling and index-state transitions.
- Embedding/index configuration compatibility checks.

### SQLite integration tests

- Migrations from an empty database.
- Repository behavior.
- FTS5 keyword retrieval.
- Atomic note and outbox writes.
- Trash, restore, and permanent deletion.
- Conflict handling.
- Recovery of pending work after restart.

### Chroma integration tests

- Run against a real Chroma container.
- Upsert and remove note chunks.
- Query explicit vectors.
- Keep collection versions isolated.
- Rebuild and switch the active collection.
- Recover after temporary Chroma unavailability.

### Browser end-to-end tests

Use Playwright for focused flows:

- Create a note and confirm editor reset/focus.
- Find notes through keyword and semantic queries.
- Open and edit a note.
- Preserve a draft during an optimistic-concurrency conflict.
- Move a note to Trash.
- Restore a note.
- Permanently delete a note.
- Observe pending indexing and invoke manual Retry.

Avoid duplicating every domain edge case in browser tests.

## Milestone acceptance criteria

Milestone one is complete when all of the following are true:

- A fresh checkout can start in development through documented Compose commands.
- A production Compose build runs locally without runtime internet access.
- The production frontend is reachable only through localhost.
- A user can create, edit, search, trash, restore, and permanently delete notes.
- Duplicate note bodies are preserved as separate notes.
- Whitespace-only and oversized requests are rejected clearly.
- Empty search shows the 20 most recently updated active notes.
- Hybrid search combines keyword and semantic candidates through the specified RRF algorithm.
- Long notes are chunked and returned once with a relevant excerpt.
- Saving remains successful and durable while Chroma is unavailable.
- Pending semantic work survives process restarts and eventually retries.
- An index can be rebuilt from SQLite into a versioned collection and switched safely.
- Runtime inference is local and performs no model download or external API call.
- The agreed unit, SQLite integration, Chroma integration, and Playwright tests pass.

## Suggested implementation sequence

This order uses vertical slices while establishing the risky infrastructure early:

1. Convert the repository to npm workspaces and move the NestJS starter into `apps/api`.
2. Add `apps/web`, shared root scripts, and development/production Compose skeletons.
3. Define the note domain behavior and capability-oriented ports.
4. Implement SQLite migrations, `NoteRepository`, FTS5, and durable outbox behavior with integration tests.
5. Expose note CRUD, recent notes, Trash, restore, permanent deletion, and conflict responses through REST/OpenAPI.
6. Implement paragraph-aware chunking and the local `EmbeddingProvider`.
7. Implement the Chroma `SemanticNoteIndex`, retry worker, and index-state reporting.
8. Implement hybrid retrieval and RRF with deterministic tests.
9. Generate the frontend API client and build the capture/search/edit/Trash flows.
10. Add model-baking, production network restrictions, persistent mounts, and offline-runtime verification.
11. Add focused Playwright coverage and complete operating documentation.

Before executing this as one large change, prefer breaking it into tracer-bullet tickets with explicit blocking relationships.

## Implementation-level choices still open

The product design is settled, but the implementing agent may make and document small technical choices that preserve it:

- Stable note identifier format.
- Exact REST endpoint paths, payload envelopes, and HTTP status details.
- Migration file naming and migration-runner mechanics.
- FTS5 tokenizer configuration and query escaping.
- Exact debounce duration.
- Exact chunk overlap and long-paragraph fallback.
- Retry intervals, cap, jitter, and worker polling mechanism.
- How index status is represented internally versus exposed through the API.
- The safe cleanup policy for superseded Chroma collections.
- React state-management and styling choices appropriate to this small application.
- OpenAPI client generator selection.

Escalate only choices that would alter product behavior, privacy, data durability, replaceable boundaries, or milestone scope.

## Suggested skills for the next agent

- Call the `to-tickets` skill to split this document into tracer-bullet GitHub issues with blocking edges.
- Call the `implement-spec` skill when implementation is authorized and tickets or a formal spec exist.
- Call the `tdd` skill for the repository, ranking, retry, and integration-test slices.
- Call the `codebase-design` skill if changing the `NoteRepository`, `SemanticNoteIndex`, or `EmbeddingProvider` boundaries.
- Call the `domain-modeling` skill when durable domain vocabulary or architectural decisions need to be captured in `GLOSSARY.md` or ADRs.

## Instruction for the next session

Do not begin implementation merely because this document exists. First confirm what unit of work the user wants to start, then create or select the corresponding issue. Treat this document as the authoritative overview unless the user explicitly changes a decision.
