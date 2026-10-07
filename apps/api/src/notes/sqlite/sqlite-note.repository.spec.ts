import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteNoteRepository } from './sqlite-note.repository';

describe('SqliteNoteRepository', () => {
  let directory: string;
  let databasePath: string;
  let repository: SqliteNoteRepository;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'vector-notepad-'));
    databasePath = join(directory, 'notes.sqlite');
    repository = new SqliteNoteRepository(databasePath);
  });

  afterEach(() => {
    repository.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('creates a note and lists the 20 most recently updated active notes', () => {
    for (let index = 0; index < 21; index += 1) {
      repository.create({
        id: `note-${index}`,
        body: `Body ${index}`,
        now: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
      });
    }

    const notes = repository.listRecent(20);

    expect(notes).toHaveLength(20);
    expect(notes[0]).toMatchObject({
      id: 'note-20',
      body: 'Body 20',
      version: 1,
    });
    expect(notes[19]).toMatchObject({
      id: 'note-1',
      body: 'Body 1',
      version: 1,
    });
  });

  it('rolls back the note when its semantic outbox write fails', () => {
    const database = new Database(databasePath);
    database.exec(`
      CREATE TRIGGER reject_semantic_work
      BEFORE INSERT ON semantic_index_outbox
      BEGIN
        SELECT RAISE(ABORT, 'forced outbox failure');
      END;
    `);
    database.close();

    expect(() =>
      repository.create({
        id: 'rolled-back-note',
        body: 'Must not survive',
        now: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow('forced outbox failure');
    expect(repository.findById('rolled-back-note')).toBeNull();
  });
});
