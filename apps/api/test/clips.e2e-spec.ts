import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ClipsController } from '../src/modules/clips/clips.controller';
import { ClipsService } from '../src/modules/clips/clips.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { TestJwtAuthGuard, TEST_BEARER_TOKEN, TEST_USER } from './test-jwt-auth-guard';

describe('ClipsController (e2e)', () => {
  let app: INestApplication;
  let service: jest.Mocked<ClipsService>;

  beforeAll(async () => {
    service = {
      generate: jest.fn(),
      list: jest.fn(),
      bulkDelete: jest.fn(),
      bulkDownloadUrls: jest.fn(),
      publish: jest.fn(),
      getPublications: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      export: jest.fn(),
    } as unknown as jest.Mocked<ClipsService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClipsController],
      providers: [{ provide: ClipsService, useValue: service }],
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
  const uuid = '123e4567-e89b-42d3-a456-426614174000';

  describe('POST /clips/generate', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer())
        .post('/clips/generate')
        .send({ video_id: uuid })
        .expect(401);
    });

    it('returns 400 for a non-UUID video_id', async () => {
      await request(app.getHttpServer())
        .post('/clips/generate')
        .set('Authorization', auth())
        .send({ video_id: 'not-a-uuid' })
        .expect(400);
    });

    it('returns 200 on success', async () => {
      service.generate.mockResolvedValue({ id: 'job1' } as never);

      const res = await request(app.getHttpServer())
        .post('/clips/generate')
        .set('Authorization', auth())
        .send({ video_id: uuid })
        .expect(201);

      expect(service.generate).toHaveBeenCalledWith(
        TEST_USER.sub,
        expect.objectContaining({ video_id: uuid }),
      );
      expect(res.body.data).toEqual({ id: 'job1' });
    });
  });

  describe('GET /clips', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).get('/clips').expect(401);
    });

    it('returns 200 with paginated results', async () => {
      service.list.mockResolvedValue({ items: [{ id: 'c1' }], total: 1 } as never);

      const res = await request(app.getHttpServer())
        .get('/clips?page=1&limit=20')
        .set('Authorization', auth())
        .expect(200);

      expect(service.list).toHaveBeenCalledWith(TEST_USER.sub, 1, 20);
      expect(res.body.data).toEqual([{ id: 'c1' }]);
    });
  });

  describe('POST /clips/bulk-delete', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer())
        .post('/clips/bulk-delete')
        .send({ clip_ids: [uuid] })
        .expect(401);
    });

    it('returns 400 for an empty clip_ids array', async () => {
      await request(app.getHttpServer())
        .post('/clips/bulk-delete')
        .set('Authorization', auth())
        .send({ clip_ids: [] })
        .expect(400);
    });

    it('returns 200 on success', async () => {
      service.bulkDelete.mockResolvedValue({ deleted_ids: [uuid] });

      const res = await request(app.getHttpServer())
        .post('/clips/bulk-delete')
        .set('Authorization', auth())
        .send({ clip_ids: [uuid] })
        .expect(201);

      expect(service.bulkDelete).toHaveBeenCalledWith(TEST_USER.sub, [uuid]);
      expect(res.body.data).toEqual({ deleted_ids: [uuid] });
    });
  });

  describe('POST /clips/bulk-download', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer())
        .post('/clips/bulk-download')
        .send({ clip_ids: [uuid] })
        .expect(401);
    });

    it('returns 400 for a non-UUID entry', async () => {
      await request(app.getHttpServer())
        .post('/clips/bulk-download')
        .set('Authorization', auth())
        .send({ clip_ids: ['nope'] })
        .expect(400);
    });

    it('returns 200 with an items wrapper on success', async () => {
      service.bulkDownloadUrls.mockResolvedValue([{ id: 'c1' } as never]);

      const res = await request(app.getHttpServer())
        .post('/clips/bulk-download')
        .set('Authorization', auth())
        .send({ clip_ids: [uuid] })
        .expect(201);

      expect(res.body.data).toEqual({ items: [{ id: 'c1' }] });
    });
  });

  describe('POST /clips/:id/publish', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer())
        .post('/clips/c1/publish')
        .send({ platforms: ['youtube'] })
        .expect(401);
    });

    it('returns 400 for an unsupported platform', async () => {
      await request(app.getHttpServer())
        .post('/clips/c1/publish')
        .set('Authorization', auth())
        .send({ platforms: ['not-a-platform'] })
        .expect(400);
    });

    it('returns 200 on success', async () => {
      service.publish.mockResolvedValue({ job: { id: 'job1' }, publications: [] } as never);

      const res = await request(app.getHttpServer())
        .post('/clips/c1/publish')
        .set('Authorization', auth())
        .send({ platforms: ['youtube'] })
        .expect(201);

      expect(service.publish).toHaveBeenCalledWith(
        TEST_USER.sub,
        'c1',
        expect.objectContaining({ platforms: ['youtube'] }),
      );
      expect(res.body.data).toEqual({ job: { id: 'job1' }, publications: [] });
    });
  });

  describe('GET /clips/:id/publications', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).get('/clips/c1/publications').expect(401);
    });

    it('returns 200 on success', async () => {
      service.getPublications.mockResolvedValue([{ id: 'p1' } as never]);

      const res = await request(app.getHttpServer())
        .get('/clips/c1/publications')
        .set('Authorization', auth())
        .expect(200);

      expect(service.getPublications).toHaveBeenCalledWith(TEST_USER.sub, 'c1');
      expect(res.body.data).toEqual([{ id: 'p1' }]);
    });
  });

  describe('GET /clips/:id', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).get('/clips/c1').expect(401);
    });

    it('returns 200 on success', async () => {
      service.get.mockResolvedValue({ id: 'c1' } as never);

      const res = await request(app.getHttpServer())
        .get('/clips/c1')
        .set('Authorization', auth())
        .expect(200);

      expect(res.body.data).toEqual({ id: 'c1' });
    });
  });

  describe('DELETE /clips/:id', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).delete('/clips/c1').expect(401);
    });

    it('returns 200 on success', async () => {
      service.delete.mockResolvedValue({ deleted: true, id: 'c1' });

      const res = await request(app.getHttpServer())
        .delete('/clips/c1')
        .set('Authorization', auth())
        .expect(200);

      expect(service.delete).toHaveBeenCalledWith(TEST_USER.sub, 'c1');
      expect(res.body.data).toEqual({ deleted: true, id: 'c1' });
    });
  });

  describe('POST /clips/:id/export', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).post('/clips/c1/export').expect(401);
    });

    it('returns 200 on success', async () => {
      service.export.mockResolvedValue({ id: 'job1' } as never);

      const res = await request(app.getHttpServer())
        .post('/clips/c1/export')
        .set('Authorization', auth())
        .expect(201);

      expect(service.export).toHaveBeenCalledWith(TEST_USER.sub, 'c1');
      expect(res.body.data).toEqual({ id: 'job1' });
    });
  });
});
