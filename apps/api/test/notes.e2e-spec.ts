import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

interface NoteResponse {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
}

describe('Notes API', () => {
  let app: INestApplication<App>;
  let directory: string;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'vector-notepad-api-'));
    process.env.SQLITE_PATH = join(directory, 'notes.sqlite');

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ bodyParser: false, logger: false });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.SQLITE_PATH;
    rmSync(directory, { recursive: true, force: true });
  });

  it('creates a note and returns it in the recent list without Chroma', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/notes')
      .send({ body: 'A durable thought' })
      .expect(201);
    const createdNote = created.body as NoteResponse;

    expect(createdNote).toMatchObject({
      body: 'A durable thought',
      version: 1,
    });
    expect(createdNote.id).toEqual(expect.any(String));
    expect(createdNote.createdAt).toEqual(expect.any(String));
    expect(createdNote.updatedAt).toBe(createdNote.createdAt);
    expect(createdNote.deletedAt).toBeNull();

    const recent = await request(app.getHttpServer())
      .get('/api/notes')
      .expect(200);
    expect(recent.body).toEqual([createdNote]);
  });

  it('rejects a whitespace-only note', async () => {
    await request(app.getHttpServer())
      .post('/api/notes')
      .send({ body: ' \n\t ' })
      .expect(400)
      .expect(({ body }) => {
        expect((body as { message: unknown }).message).toBe(
          'Note body must contain non-whitespace text',
        );
      });
  });

  it('rejects request bodies larger than 1 MiB', async () => {
    await request(app.getHttpServer())
      .post('/api/notes')
      .send({ body: 'x'.repeat(1024 * 1024) })
      .expect(413);
  });

  it('publishes the note API in its OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const document = response.body as { paths: Record<string, unknown> };

    expect(document.paths).toHaveProperty('/api/notes');
  });
});
