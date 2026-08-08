import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PlatformsController } from '../src/modules/platforms/platforms.controller';
import { PlatformsService } from '../src/modules/platforms/platforms.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { FakeJwtAuthGuard, E2E_TEST_USER, E2E_VALID_TOKEN } from './utils/fake-jwt-auth.guard';

describe('PlatformsController (e2e)', () => {
  let app: INestApplication;
  let service: jest.Mocked<PlatformsService>;

  const AUTH_HEADER = `Bearer ${E2E_VALID_TOKEN}`;

  beforeAll(async () => {
    const mockService = {
      list: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      getYoutubeOAuthUrl: jest.fn(),
      getInstagramOAuthUrl: jest.fn(),
      handleYoutubeCallback: jest.fn(),
      handleInstagramCallback: jest.fn(),
    };

    const mockConfig = { get: jest.fn(() => 'https://app.example.com') };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PlatformsController],
      providers: [
        { provide: PlatformsService, useValue: mockService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    service = moduleRef.get(PlatformsService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/platforms', () => {
    it('returns 401 without an Authorization header', async () => {
      await request(app.getHttpServer()).get('/api/v1/platforms').expect(401);
      expect(service.list).not.toHaveBeenCalled();
    });

    it('returns the platform list for an authenticated user', async () => {
      service.list.mockResolvedValue([{ platform: 'youtube', can_post: true }] as never);

      const res = await request(app.getHttpServer())
        .get('/api/v1/platforms')
        .set('Authorization', AUTH_HEADER)
        .expect(200);

      expect(service.list).toHaveBeenCalledWith(E2E_TEST_USER.sub);
      expect(res.body).toEqual({
        success: true,
        data: [{ platform: 'youtube', can_post: true }],
      });
    });
  });

  describe('POST /api/v1/platforms', () => {
    it('returns 401 without an Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/platforms')
        .send({ platform: 'youtube' })
        .expect(401);
      expect(service.connect).not.toHaveBeenCalled();
    });

    it('connects a supported platform for an authenticated user', async () => {
      service.connect.mockResolvedValue({ platform: 'youtube', oauth_url: 'https://x' } as never);

      const res = await request(app.getHttpServer())
        .post('/api/v1/platforms')
        .set('Authorization', AUTH_HEADER)
        .send({ platform: 'youtube' })
        .expect(201);

      expect(service.connect).toHaveBeenCalledWith(
        E2E_TEST_USER.sub,
        { platform: 'youtube' },
        E2E_TEST_USER.email,
      );
      expect(res.body.data).toEqual({ platform: 'youtube', oauth_url: 'https://x' });
    });

    it('returns 400 for an unsupported platform value', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/platforms')
        .set('Authorization', AUTH_HEADER)
        .send({ platform: 'twitter' })
        .expect(400);

      expect(service.connect).not.toHaveBeenCalled();
      expect(res.body.message ?? res.body.error).toBeDefined();
    });

    it('returns 400 when platform is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/platforms')
        .set('Authorization', AUTH_HEADER)
        .send({})
        .expect(400);
      expect(service.connect).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/platforms/:platform', () => {
    it('returns 401 without an Authorization header', async () => {
      await request(app.getHttpServer()).delete('/api/v1/platforms/youtube').expect(401);
    });

    it('disconnects a platform for an authenticated user', async () => {
      service.disconnect.mockResolvedValue({ removed: true });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/platforms/youtube')
        .set('Authorization', AUTH_HEADER)
        .expect(200);

      expect(service.disconnect).toHaveBeenCalledWith(E2E_TEST_USER.sub, 'youtube');
      expect(res.body.data).toEqual({ removed: true });
    });

    it('propagates a 404 when the service reports the connection was not found', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      service.disconnect.mockRejectedValue(new NotFoundException('Platform connection not found'));

      await request(app.getHttpServer())
        .delete('/api/v1/platforms/youtube')
        .set('Authorization', AUTH_HEADER)
        .expect(404);
    });
  });

  describe('GET /api/v1/platforms/youtube/oauth-url', () => {
    it('returns 401 without an Authorization header', async () => {
      await request(app.getHttpServer()).get('/api/v1/platforms/youtube/oauth-url').expect(401);
    });

    it('returns the oauth url for an authenticated user', async () => {
      service.getYoutubeOAuthUrl.mockReturnValue({ url: 'https://accounts.google.com/x' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/platforms/youtube/oauth-url')
        .set('Authorization', AUTH_HEADER)
        .expect(200);

      expect(service.getYoutubeOAuthUrl).toHaveBeenCalledWith(E2E_TEST_USER.sub);
      expect(res.body.data).toEqual({ url: 'https://accounts.google.com/x' });
    });

    it('propagates a 400 when OAuth is not configured', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      service.getYoutubeOAuthUrl.mockImplementation(() => {
        throw new BadRequestException('YouTube OAuth is not configured');
      });

      await request(app.getHttpServer())
        .get('/api/v1/platforms/youtube/oauth-url')
        .set('Authorization', AUTH_HEADER)
        .expect(400);
    });
  });

  describe('GET /api/v1/platforms/instagram/oauth-url', () => {
    it('returns 401 without an Authorization header', async () => {
      await request(app.getHttpServer()).get('/api/v1/platforms/instagram/oauth-url').expect(401);
    });

    it('returns the oauth url for an authenticated user', async () => {
      service.getInstagramOAuthUrl.mockReturnValue({ url: 'https://api.instagram.com/x' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/platforms/instagram/oauth-url')
        .set('Authorization', AUTH_HEADER)
        .expect(200);

      expect(service.getInstagramOAuthUrl).toHaveBeenCalledWith(E2E_TEST_USER.sub);
      expect(res.body.data).toEqual({ url: 'https://api.instagram.com/x' });
    });
  });

  describe('GET /api/v1/platforms/youtube/callback (public)', () => {
    it('does not require Authorization and redirects on success', async () => {
      service.handleYoutubeCallback.mockResolvedValue('https://app.example.com/setup/platforms?status=success');

      const res = await request(app.getHttpServer())
        .get('/api/v1/platforms/youtube/callback?code=abc&state=xyz')
        .expect(302);

      expect(service.handleYoutubeCallback).toHaveBeenCalledWith('abc', 'xyz');
      expect(res.headers.location).toBe('https://app.example.com/setup/platforms?status=success');
    });

    it('redirects to an error URL when the provider returns an error param', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platforms/youtube/callback?error=access_denied')
        .expect(302);

      expect(service.handleYoutubeCallback).not.toHaveBeenCalled();
      expect(res.headers.location).toContain('status=error');
    });

    it('redirects to an error URL when the service throws', async () => {
      service.handleYoutubeCallback.mockRejectedValue(new Error('invalid state'));

      const res = await request(app.getHttpServer())
        .get('/api/v1/platforms/youtube/callback?code=abc&state=bad')
        .expect(302);

      expect(res.headers.location).toContain('status=error');
    });
  });

  describe('GET /api/v1/platforms/instagram/callback (public)', () => {
    it('does not require Authorization and redirects on success', async () => {
      service.handleInstagramCallback.mockResolvedValue('https://app.example.com/setup/platforms?status=success');

      const res = await request(app.getHttpServer())
        .get('/api/v1/platforms/instagram/callback?code=abc&state=xyz')
        .expect(302);

      expect(service.handleInstagramCallback).toHaveBeenCalledWith('abc', 'xyz');
      expect(res.headers.location).toBe('https://app.example.com/setup/platforms?status=success');
    });

    it('redirects to an error URL when code/state are missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/platforms/instagram/callback')
        .expect(302);

      expect(service.handleInstagramCallback).not.toHaveBeenCalled();
      expect(res.headers.location).toContain('status=error');
    });
  });
});
