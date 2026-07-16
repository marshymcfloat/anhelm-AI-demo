import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import Database from 'better-sqlite3';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { corsOptions } from './../src/cors.config';

interface CreatedConversationResponse {
  id: string;
}

interface SendMessageResponse {
  messageId: string;
}

interface StoredMessage {
  role: string;
  content: string;
  status: string;
}

interface ConversationSummary {
  id: string;
  brandId: string;
  visitorId: string;
  messageCount: number;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const visitorId = 'test-visitor-1234';
  const databasePath = resolve('prisma/test.db');

  beforeAll(async () => {
    rmSync(databasePath, { force: true });
    const database = new Database(databasePath);
    database.exec(
      readFileSync(
        resolve(
          'prisma/migrations/20260716184000_init_conversations/migration.sql',
        ),
        'utf8',
      ),
    );
    database.close();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors(corsOptions);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(databasePath, { force: true });
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/brands (GET)', () => {
    return request(app.getHttpServer())
      .get('/brands')
      .expect(200)
      .expect([
        {
          id: 'tri-consulting-services',
          displayName: 'TRI Consulting Services',
        },
      ]);
  });

  it('allows CORS from localhost:5173', () => {
    return request(app.getHttpServer())
      .options('/brands')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'http://localhost:5173');
  });

  it('allows CORS from localhost:5174', () => {
    return request(app.getHttpServer())
      .options('/brands')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'http://localhost:5174');
  });

  it('allows CORS from tric.anhelm.dev', () => {
    return request(app.getHttpServer())
      .options('/brands')
      .set('Origin', 'https://tric.anhelm.dev')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'https://tric.anhelm.dev');
  });

  it('/brands/tri-consulting-services/chat refuses unrelated requests', () => {
    return request(app.getHttpServer())
      .post('/brands/tri-consulting-services/chat')
      .send({ message: 'What is the weather in Manila?' })
      .expect(201)
      .expect({
        brandId: 'tri-consulting-services',
        status: 'refused',
        answer:
          'I can only help with questions directly related to TRI Consulting Services.',
      });
  });

  it('creates, lists, and persists a guarded conversation', async () => {
    const created = await request(app.getHttpServer())
      .post('/brands/tri-consulting-services/conversations')
      .send({ visitorId })
      .expect(201);

    const conversationId = (created.body as CreatedConversationResponse).id;
    expect(conversationId).toBeTruthy();

    const reply = await request(app.getHttpServer())
      .post(`/conversations/${conversationId}/messages`)
      .send({
        visitorId,
        message: 'What is the weather in Manila?',
      })
      .expect(201);

    expect(reply.body).toMatchObject({
      conversationId,
      brandId: 'tri-consulting-services',
      status: 'refused',
      answer:
        'I can only help with questions directly related to TRI Consulting Services.',
    });
    expect((reply.body as SendMessageResponse).messageId).toEqual(
      expect.any(String),
    );

    const messages = await request(app.getHttpServer())
      .get(`/conversations/${conversationId}/messages`)
      .query({ visitorId })
      .expect(200);

    const storedMessages = messages.body as StoredMessage[];
    expect(storedMessages).toHaveLength(2);
    expect(storedMessages[0]).toMatchObject({
      role: 'user',
      content: 'What is the weather in Manila?',
    });
    expect(storedMessages[1]).toMatchObject({
      role: 'assistant',
      status: 'refused',
    });

    const conversations = await request(app.getHttpServer())
      .get('/brands/tri-consulting-services/conversations')
      .query({ visitorId })
      .expect(200);

    const summaries = conversations.body as ConversationSummary[];
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: conversationId,
      brandId: 'tri-consulting-services',
      visitorId,
      messageCount: 2,
    });
  });
});
