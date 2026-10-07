import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateNoteDto, NoteResponseDto } from './notes.dto';
import { NotesService } from './notes.service';

@ApiTags('notes')
@Controller('api/notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  @ApiCreatedResponse({ type: NoteResponseDto })
  @ApiBadRequestResponse({ description: 'The note body is empty or invalid' })
  @ApiPayloadTooLargeResponse({ description: 'The request body exceeds 1 MiB' })
  create(@Body() request: CreateNoteDto): NoteResponseDto {
    return new NoteResponseDto(this.notes.create(request.body));
  }

  @Get()
  @ApiOkResponse({ type: NoteResponseDto, isArray: true })
  listRecent(): NoteResponseDto[] {
    return this.notes.listRecent().map((note) => new NoteResponseDto(note));
  }
}
