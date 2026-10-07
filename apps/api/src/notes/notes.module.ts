import { Module } from '@nestjs/common';
import { join, resolve } from 'node:path';
import { NOTE_REPOSITORY } from './note.repository';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { SqliteNoteRepository } from './sqlite/sqlite-note.repository';

@Module({
  controllers: [NotesController],
  providers: [
    NotesService,
    {
      provide: NOTE_REPOSITORY,
      useFactory: () =>
        new SqliteNoteRepository(
          process.env.SQLITE_PATH ??
            join(
              process.env.VECTOR_NOTEPAD_DATA_ROOT ??
                resolve(process.cwd(), '..', '..', 'data'),
              'sqlite',
              'notes.sqlite',
            ),
        ),
    },
  ],
})
export class NotesModule {}
