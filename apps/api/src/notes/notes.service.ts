import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Note } from './note';
import { NOTE_REPOSITORY } from './note.repository';
import type { NoteRepository } from './note.repository';

@Injectable()
export class NotesService {
  constructor(
    @Inject(NOTE_REPOSITORY)
    private readonly notes: NoteRepository,
  ) {}

  create(body: unknown): Note {
    if (typeof body !== 'string' || body.trim().length === 0) {
      throw new BadRequestException(
        'Note body must contain non-whitespace text',
      );
    }

    const now = new Date().toISOString();
    return this.notes.create({ id: randomUUID(), body, now });
  }

  listRecent(): Note[] {
    return this.notes.listRecent(20);
  }
}
