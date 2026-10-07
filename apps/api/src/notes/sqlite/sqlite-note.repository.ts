import Database from 'better-sqlite3';
import type { OnModuleDestroy } from '@nestjs/common';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NewNote, Note } from '../note';
import { NoteRepository } from '../note.repository';

interface NoteRow {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at: string | null;
}

const migrations = [
  {
    version: 1,
    filename: '001_create_notes.sql',
  },
];

export class SqliteNoteRepository implements NoteRepository, OnModuleDestroy {
  private readonly database: Database.Database;

  constructor(databasePath: string) {
    if (databasePath !== ':memory:') {
      mkdirSync(dirname(databasePath), { recursive: true });
    }

    this.database = new Database(databasePath);
    this.database.pragma('foreign_keys = ON');
    this.migrate();
  }

  create(note: NewNote): Note {
    const createInTransaction = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO notes (
            id, body, created_at, updated_at, version, deleted_at
          ) VALUES (?, ?, ?, ?, 1, NULL)`,
        )
        .run(note.id, note.body, note.now, note.now);

      this.database
        .prepare(
          `INSERT INTO semantic_index_outbox (
            note_id, operation, note_version, status, attempts,
            next_attempt_at, last_error, created_at
          ) VALUES (?, 'upsert', 1, 'pending', 0, ?, NULL, ?)`,
        )
        .run(note.id, note.now, note.now);
    });

    createInTransaction();
    return this.requireById(note.id);
  }

  findById(id: string): Note | null {
    const row = this.database
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(id) as NoteRow | undefined;

    return row ? this.toNote(row) : null;
  }

  listRecent(limit: number): Note[] {
    const rows = this.database
      .prepare(
        `SELECT * FROM notes
         WHERE deleted_at IS NULL
         ORDER BY updated_at DESC, id DESC
         LIMIT ?`,
      )
      .all(limit) as NoteRow[];

    return rows.map((row) => this.toNote(row));
  }

  close(): void {
    this.database.close();
  }

  onModuleDestroy(): void {
    this.close();
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      ) STRICT;
    `);

    const applied = new Set(
      (
        this.database
          .prepare('SELECT version FROM schema_migrations')
          .all() as Array<{
          version: number;
        }>
      ).map(({ version }) => version),
    );

    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        continue;
      }

      const sql = readFileSync(
        join(__dirname, 'migrations', migration.filename),
        'utf8',
      );
      this.database.transaction(() => {
        this.database.exec(sql);
        this.database
          .prepare(
            'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          )
          .run(migration.version, new Date().toISOString());
      })();
    }
  }

  private requireById(id: string): Note {
    const note = this.findById(id);
    if (!note) {
      throw new Error(`Created note ${id} was not found`);
    }
    return note;
  }

  private toNote(row: NoteRow): Note {
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      deletedAt: row.deleted_at,
    };
  }
}
