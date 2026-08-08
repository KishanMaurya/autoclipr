import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ChannelsController } from '../src/modules/channels/channels.controller';
import { ChannelsService } from '../src/modules/channels/channels.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { TestJwtAuthGuard, TEST_BEARER_TOKEN, TEST_USER } from './test-jwt-auth-guard';

describe('ChannelsController (e2e)', () => {
  let app: INestApplication;
  let service: jest.Mocked<ChannelsService>;

  beforeAll(async () => {
    service = {
      list: jest.fn(),
      resolveChannel: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<ChannelsService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [{ provide: ChannelsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

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

  const auth = () => TEST_BEARER_TOKEN;

  describe('GET /channels', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).get('/channels').expect(401);
    });

    it('returns 200 on success', async () => {
      service.list.mockResolvedValue([{ id: 'ch1' } as never]);

      const res = await request(app.getHttpServer())
        .get('/channels')
        .set('Authorization', auth())
        .expect(200);

      expect(service.list).toHaveBeenCalledWith(TEST_USER.sub);
      expect(res.body.data).toEqual([{ id: 'ch1' }]);
    });
  });

  describe('GET /channels/resolve', () => {
    it('is reachable without an authorization header (public route)', async () => {
      service.resolveChannel.mockResolvedValue({
        channel_url: 'https://www.youtube.com/@x',
        channel_name: 'X',
      });

      const res = await request(app.getHttpServer())
        .get('/channels/resolve?q=@x')
        .expect(200);

      expect(service.resolveChannel).toHaveBeenCalledWith('@x');
      expect(res.body.data.channel_name).toBe('X');
    });

    it('returns 400 when q is missing', async () => {
      await request(app.getHttpServer()).get('/channels/resolve').expect(400);
    });

    it('returns 400 when q is whitespace only', async () => {
      await request(app.getHttpServer())
        .get('/channels/resolve')
        .query({ q: '   ' })
        .expect(400);
    });
  });

  describe('POST /channels', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer())
        .post('/channels')
        .send({ channel_url: 'https://www.youtube.com/@x', channel_name: 'X' })
        .expect(401);
    });

    it('returns 400 for an invalid channel_url', async () => {
      await request(app.getHttpServer())
        .post('/channels')
        .set('Authorization', auth())
        .send({ channel_url: 'not-a-url', channel_name: 'X' })
        .expect(400);
    });

    it('returns 200 on success', async () => {
      service.connect.mockResolvedValue({ id: 'ch1' } as never);

      const res = await request(app.getHttpServer())
        .post('/channels')
        .set('Authorization', auth())
        .send({ channel_url: 'https://www.youtube.com/@x', channel_name: 'X' })
        .expect(201);

      expect(service.connect).toHaveBeenCalledWith(
        TEST_USER.sub,
        expect.objectContaining({ channel_url: 'https://www.youtube.com/@x', channel_name: 'X' }),
      );
      expect(res.body.data).toEqual({ id: 'ch1' });
    });
  });

  describe('DELETE /channels/:id', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).delete('/channels/ch1').expect(401);
    });

    it('returns 200 on success', async () => {
      service.disconnect.mockResolvedValue({ removed: true });

      const res = await request(app.getHttpServer())
        .delete('/channels/ch1')
        .set('Authorization', auth())
        .expect(200);

      expect(service.disconnect).toHaveBeenCalledWith(TEST_USER.sub, 'ch1');
      expect(res.body.data).toEqual({ removed: true });
    });
  });
});
