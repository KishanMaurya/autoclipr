import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { VideosController } from '../src/modules/videos/videos.controller';
import { VideosService } from '../src/modules/videos/videos.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { TestJwtAuthGuard, TEST_BEARER_TOKEN, TEST_USER } from './test-jwt-auth-guard';

describe('VideosController (e2e)', () => {
  let app: INestApplication;
  let service: jest.Mocked<VideosService>;

  beforeAll(async () => {
    service = {
      initUpload: jest.fn(),
      importFromUrl: jest.fn(),
      delete: jest.fn(),
      completeUpload: jest.fn(),
      list: jest.fn(),
      getPipeline: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<VideosService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [VideosController],
      providers: [{ provide: VideosService, useValue: service }],
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

  describe('POST /videos/upload', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer())
        .post('/videos/upload')
        .send({ title: 't', filename: 'f.mp4' })
        .expect(401);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/videos/upload')
        .set('Authorization', auth())
        .send({})
        .expect(400);
    });

    it('returns 200 and the created upload info on success', async () => {
      service.initUpload.mockResolvedValue({
        video_id: 'v1',
        upload_url: 'https://signed/upload',
        storage_path: 'path',
      });

      const res = await request(app.getHttpServer())
        .post('/videos/upload')
        .set('Authorization', auth())
        .send({ title: 'My video', filename: 'f.mp4' })
        .expect(201);

      expect(service.initUpload).toHaveBeenCalledWith(
        TEST_USER.sub,
        expect.objectContaining({ title: 'My video', filename: 'f.mp4' }),
      );
      expect(res.body).toEqual({
        success: true,
        data: { video_id: 'v1', upload_url: 'https://signed/upload', storage_path: 'path' },
      });
    });
  });

  describe('POST /videos/import-url', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer())
        .post('/videos/import-url')
        .send({ url: 'https://www.youtube.com/watch?v=1' })
        .expect(401);
    });

    it('returns 400 for an invalid URL', async () => {
      await request(app.getHttpServer())
        .post('/videos/import-url')
        .set('Authorization', auth())
        .send({ url: 'not-a-url' })
        .expect(400);
    });

    it('returns 200 on success', async () => {
      service.importFromUrl.mockResolvedValue({
        video_id: 'v1',
        job_id: 'job1',
        source_type: 'youtube',
        source_label: 'YouTube',
        title: 't',
        status: 'importing',
      });

      const res = await request(app.getHttpServer())
        .post('/videos/import-url')
        .set('Authorization', auth())
        .send({ url: 'https://www.youtube.com/watch?v=1' })
        .expect(201);

      expect(res.body.data.video_id).toBe('v1');
    });
  });

  describe('POST /videos/delete', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer())
        .post('/videos/delete')
        .send({ video_id: '123e4567-e89b-42d3-a456-426614174000' })
        .expect(401);
    });

    it('returns 400 for a non-UUID video_id', async () => {
      await request(app.getHttpServer())
        .post('/videos/delete')
        .set('Authorization', auth())
        .send({ video_id: 'not-a-uuid' })
        .expect(400);
    });

    it('returns 200 on success', async () => {
      service.delete.mockResolvedValue({ deleted: true, id: 'v1' });

      const res = await request(app.getHttpServer())
        .post('/videos/delete')
        .set('Authorization', auth())
        .send({ video_id: '123e4567-e89b-42d3-a456-426614174000' })
        .expect(201);

      expect(service.delete).toHaveBeenCalledWith(
        TEST_USER.sub,
        '123e4567-e89b-42d3-a456-426614174000',
      );
      expect(res.body.data).toEqual({ deleted: true, id: 'v1' });
    });
  });

  describe('POST /videos/:id/complete', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).post('/videos/v1/complete').expect(401);
    });

    it('returns 200 on success', async () => {
      service.completeUpload.mockResolvedValue({ status: 'processing' });

      const res = await request(app.getHttpServer())
        .post('/videos/v1/complete')
        .set('Authorization', auth())
        .expect(201);

      expect(service.completeUpload).toHaveBeenCalledWith(TEST_USER.sub, 'v1');
      expect(res.body.data).toEqual({ status: 'processing' });
    });
  });

  describe('GET /videos', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).get('/videos').expect(401);
    });

    it('returns 200 with paginated results', async () => {
      service.list.mockResolvedValue({ items: [{ id: 'v1' }], total: 1 } as never);

      const res = await request(app.getHttpServer())
        .get('/videos?page=1&limit=20')
        .set('Authorization', auth())
        .expect(200);

      expect(service.list).toHaveBeenCalledWith(TEST_USER.sub, 1, 20);
      expect(res.body.data).toEqual([{ id: 'v1' }]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1, has_more: false });
    });
  });

  describe('GET /videos/:id/pipeline', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).get('/videos/v1/pipeline').expect(401);
    });

    it('returns 200 on success', async () => {
      service.getPipeline.mockResolvedValue({ video_id: 'v1', status: 'ready' } as never);

      const res = await request(app.getHttpServer())
        .get('/videos/v1/pipeline')
        .set('Authorization', auth())
        .expect(200);

      expect(service.getPipeline).toHaveBeenCalledWith(TEST_USER.sub, 'v1');
      expect(res.body.data.video_id).toBe('v1');
    });
  });

  describe('GET /videos/:id', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).get('/videos/v1').expect(401);
    });

    it('returns 200 on success', async () => {
      service.get.mockResolvedValue({ id: 'v1' } as never);

      const res = await request(app.getHttpServer())
        .get('/videos/v1')
        .set('Authorization', auth())
        .expect(200);

      expect(res.body.data).toEqual({ id: 'v1' });
    });
  });

  describe('DELETE /videos/:id', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).delete('/videos/v1').expect(401);
    });

    it('returns 200 on success', async () => {
      service.delete.mockResolvedValue({ deleted: true, id: 'v1' });

      const res = await request(app.getHttpServer())
        .delete('/videos/v1')
        .set('Authorization', auth())
        .expect(200);

      expect(service.delete).toHaveBeenCalledWith(TEST_USER.sub, 'v1');
      expect(res.body.data).toEqual({ deleted: true, id: 'v1' });
    });
  });

  describe('POST /videos/:id/delete', () => {
    it('returns 401 without an authorization header', async () => {
      await request(app.getHttpServer()).post('/videos/v1/delete').expect(401);
    });

    it('returns 200 on success', async () => {
      service.delete.mockResolvedValue({ deleted: true, id: 'v1' });

      const res = await request(app.getHttpServer())
        .post('/videos/v1/delete')
        .set('Authorization', auth())
        .expect(201);

      expect(service.delete).toHaveBeenCalledWith(TEST_USER.sub, 'v1');
      expect(res.body.data).toEqual({ deleted: true, id: 'v1' });
    });
  });

  it('rejects a request with a malformed authorization header (not "Bearer <token>")', async () => {
    await request(app.getHttpServer())
      .get('/videos')
      .set('Authorization', 'garbage')
      .expect(401);
  });
});
