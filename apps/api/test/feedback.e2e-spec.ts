import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { FeedbackController } from '../src/modules/feedback/feedback.controller';
import { FeedbackService } from '../src/modules/feedback/feedback.service';
import { OptionalJwtAuthGuard } from '../src/common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { makeStubConfigService, signTestToken } from './jwt-test-helper';

describe('FeedbackController (e2e)', () => {
  let app: INestApplication;
  const feedbackService = {
    create: jest.fn(),
  };

  const validPayload = {
    name: 'Alice',
    email: 'alice@example.com',
    category: 'bug',
    message: 'Something broke on the dashboard page.',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        { provide: FeedbackService, useValue: feedbackService },
        JwtAuthGuard,
        OptionalJwtAuthGuard,
        Reflector,
        { provide: ConfigService, useValue: makeStubConfigService() },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates feedback anonymously when there is no Authorization header', async () => {
    feedbackService.create.mockResolvedValue({ id: 'f1', created_at: '2026-01-01T00:00:00Z' });

    const res = await request(app.getHttpServer()).post('/feedback').send(validPayload).expect(201);

    expect(feedbackService.create).toHaveBeenCalledWith(validPayload, undefined);
    expect(res.body).toEqual({ success: true, data: { id: 'f1', created_at: '2026-01-01T00:00:00Z' } });
  });

  it('creates feedback tied to the current user when a valid token is present', async () => {
    feedbackService.create.mockResolvedValue({ id: 'f2', created_at: '2026-01-02T00:00:00Z' });
    const token = await signTestToken({ sub: 'user-1', email: 'user1@x.com' });

    await request(app.getHttpServer())
      .post('/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload)
      .expect(201);

    expect(feedbackService.create).toHaveBeenCalledWith(validPayload, 'user-1');
  });

  it('still succeeds (anonymously) when the token is invalid, since auth is optional', async () => {
    feedbackService.create.mockResolvedValue({ id: 'f3', created_at: '2026-01-03T00:00:00Z' });

    await request(app.getHttpServer())
      .post('/feedback')
      .set('Authorization', 'Bearer not-a-real-token')
      .send(validPayload)
      .expect(201);

    expect(feedbackService.create).toHaveBeenCalledWith(validPayload, undefined);
  });

  describe('validation', () => {
    it('rejects a message shorter than 10 characters', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ ...validPayload, message: 'short' })
        .expect(400);
      expect(feedbackService.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid email', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ ...validPayload, email: 'not-an-email' })
        .expect(400);
    });

    it('rejects a category outside the allowed set', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ ...validPayload, category: 'not-a-category' })
        .expect(400);
    });

    it('rejects a missing name', async () => {
      const { name, ...rest } = validPayload;
      await request(app.getHttpServer()).post('/feedback').send(rest).expect(400);
    });

    it('accepts an optional page_url when it is a well-formed URL', async () => {
      feedbackService.create.mockResolvedValue({ id: 'f4', created_at: '2026-01-04T00:00:00Z' });
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ ...validPayload, page_url: 'https://app.example.com/contact' })
        .expect(201);
    });

    it('rejects a page_url without a protocol', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ ...validPayload, page_url: 'app.example.com/contact' })
        .expect(400);
    });

    it('strips unknown fields due to the global whitelist ValidationPipe', async () => {
      feedbackService.create.mockResolvedValue({ id: 'f5', created_at: '2026-01-05T00:00:00Z' });
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ ...validPayload, unexpectedField: 'should be stripped' })
        .expect(201);
      expect(feedbackService.create).toHaveBeenCalledWith(validPayload, undefined);
    });
  });
});
