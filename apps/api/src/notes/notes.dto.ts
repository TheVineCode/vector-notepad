import { ApiProperty } from '@nestjs/swagger';
import type { Note } from './note';

export class CreateNoteDto {
  @ApiProperty({ type: String, description: 'Opaque UTF-8 note text' })
  body?: unknown;
}

export class NoteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;

  @ApiProperty({ minimum: 1 })
  version: number;

  @ApiProperty({ format: 'date-time', nullable: true })
  deletedAt: string | null;

  constructor(note: Note) {
    this.id = note.id;
    this.body = note.body;
    this.createdAt = note.createdAt;
    this.updatedAt = note.updatedAt;
    this.version = note.version;
    this.deletedAt = note.deletedAt;
  }
}
