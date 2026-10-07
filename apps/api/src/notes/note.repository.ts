import { NewNote, Note } from './note';

export const NOTE_REPOSITORY = Symbol('NOTE_REPOSITORY');

export interface NoteRepository {
  create(note: NewNote): Note;
  findById(id: string): Note | null;
  listRecent(limit: number): Note[];
}
