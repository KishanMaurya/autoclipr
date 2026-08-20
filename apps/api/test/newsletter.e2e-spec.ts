import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { NewsletterController } from '../src/modules/newsletter/newsletter.controller';
import { NewsletterService } from '../src/modules/newsletter/newsletter.service';
import { OptionalJwtAuthGuard } from '../src/common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { makeStubConfigService, signTestToken } from './jwt-test-helper';

describe('NewsletterController (e2e)', () => {
  let app: INestApplication;
  const newsletterService = {
    subscribe: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        { provide: NewsletterService, useValue: newsletterService },
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
    newsletterService.subscribe.mockResolvedValue({ alreadySubscribed: false });
  });

  it('subscribes anonymously with no Authorization header', async () => {
    const res = await request(app.getHttpServer())
      .post('/newsletter/subscribe')
      .send({ email: 'jane@example.com' })
      .expect(201);

    expect(newsletterService.subscribe).toHaveBeenCalledWith({ email: 'jane@example.com' }, undefined);
    expect(res.body).toEqual({
      success: true,
      data: { subscribed: true, already_subscribed: false },
    });
  });

  it('attaches the current user when a valid token is present', async () => {
    const token = await signTestToken({ sub: 'user-1' });

    await request(app.getHttpServer())
      .post('/newsletter/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'jane@example.com' })
      .expect(201);

    expect(newsletterService.subscribe).toHaveBeenCalledWith(
      { email: 'jane@example.com' },
      'user-1',
    );
  });

  it('returns the same shape for an already-subscribed address', async () => {
    newsletterService.subscribe.mockResolvedValue({ alreadySubscribed: true });

    const res = await request(app.getHttpServer())
      .post('/newsletter/subscribe')
      .send({ email: 'jane@example.com' })
      .expect(201);

    expect(res.body.data.subscribed).toBe(true);
    expect(res.body.data.already_subscribed).toBe(true);
  });

  it('rejects a malformed email with 400 and never calls the service', async () => {
    await request(app.getHttpServer())
      .post('/newsletter/subscribe')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(newsletterService.subscribe).not.toHaveBeenCalled();
  });

  it('rejects a missing email with 400', async () => {
    await request(app.getHttpServer()).post('/newsletter/subscribe').send({}).expect(400);

    expect(newsletterService.subscribe).not.toHaveBeenCalled();
  });

  it('strips unknown fields before they reach the service', async () => {
    await request(app.getHttpServer())
      .post('/newsletter/subscribe')
      .send({ email: 'jane@example.com', isAdmin: true })
      .expect(201);

    expect(newsletterService.subscribe).toHaveBeenCalledWith(
      { email: 'jane@example.com' },
      undefined,
    );
  });

  it('accepts source and page_url when provided', async () => {
    await request(app.getHttpServer())
      .post('/newsletter/subscribe')
      .send({ email: 'jane@example.com', source: 'blog', page_url: 'https://autoclipr.com/blog' })
      .expect(201);

    expect(newsletterService.subscribe).toHaveBeenCalledWith(
      { email: 'jane@example.com', source: 'blog', page_url: 'https://autoclipr.com/blog' },
      undefined,
    );
  });
});
