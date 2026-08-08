import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AnalyticsController } from '../src/modules/analytics/analytics.controller';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { FakeJwtAuthGuard, E2E_TEST_USER, E2E_VALID_TOKEN } from './utils/fake-jwt-auth.guard';

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;
  let service: jest.Mocked<AnalyticsService>;

  const AUTH_HEADER = `Bearer ${E2E_VALID_TOKEN}`;

  beforeAll(async () => {
    const mockService = {
      getOverview: jest.fn(),
      refreshMetrics: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    service = moduleRef.get(AnalyticsService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/analytics', () => {
    it('returns 401 without an Authorization header', async () => {
      await request(app.getHttpServer()).get('/api/v1/analytics').expect(401);
      expect(service.getOverview).not.toHaveBeenCalled();
    });

    it('returns the overview for an authenticated user without forcing a refresh', async () => {
      service.getOverview.mockResolvedValue({ summary: { posted_count: 2 } } as never);

      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics')
        .set('Authorization', AUTH_HEADER)
        .expect(200);

      expect(service.getOverview).toHaveBeenCalledWith(E2E_TEST_USER.sub, false);
      expect(res.body).toEqual({ success: true, data: { summary: { posted_count: 2 } } });
    });

    it('returns 500 when the service throws unexpectedly', async () => {
      service.getOverview.mockRejectedValue(new Error('db down'));

      await request(app.getHttpServer())
        .get('/api/v1/analytics')
        .set('Authorization', AUTH_HEADER)
        .expect(500);
    });
  });

  describe('POST /api/v1/analytics/refresh', () => {
    it('returns 401 without an Authorization header', async () => {
      await request(app.getHttpServer()).post('/api/v1/analytics/refresh').expect(401);
      expect(service.refreshMetrics).not.toHaveBeenCalled();
    });

    it('refreshes metrics then returns the overview for an authenticated user', async () => {
      service.refreshMetrics.mockResolvedValue({ refreshed: 4 });
      service.getOverview.mockResolvedValue({ summary: { posted_count: 4 } } as never);

      const res = await request(app.getHttpServer())
        .post('/api/v1/analytics/refresh')
        .set('Authorization', AUTH_HEADER)
        .expect(201);

      expect(service.refreshMetrics).toHaveBeenCalledWith(E2E_TEST_USER.sub);
      expect(service.getOverview).toHaveBeenCalledWith(E2E_TEST_USER.sub, false);
      expect(res.body.data).toEqual({ summary: { posted_count: 4 } });
    });
  });
});
