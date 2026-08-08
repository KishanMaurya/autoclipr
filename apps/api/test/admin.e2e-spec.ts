import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AdminController } from '../src/modules/admin/admin.controller';
import { AdminService } from '../src/modules/admin/admin.service';
import { AdminGuard } from '../src/common/guards/admin.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { makeStubConfigService, signTestToken } from './jwt-test-helper';

const ADMIN_EMAIL = 'admin@autoclipr.test';
const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS;

describe('AdminController (e2e)', () => {
  let app: INestApplication;
  const adminService = {
    getExecutiveDashboard: jest.fn(),
    getAuditLogs: jest.fn(),
    getAnalytics: jest.fn(),
    getTopCreators: jest.fn(),
    getClipsByUser: jest.fn(),
    getErrors: jest.fn(),
  };

  beforeAll(async () => {
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        JwtAuthGuard,
        AdminGuard,
        Reflector,
        { provide: ConfigService, useValue: makeStubConfigService() },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS;
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests with no Authorization header (401)', async () => {
    await request(app.getHttpServer()).get('/admin/stats').expect(401);
  });

  it('rejects requests with a malformed Authorization header (401)', async () => {
    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Authorization', 'NotBearer abc')
      .expect(401);
  });

  it('rejects an authenticated but non-admin user (403)', async () => {
    const token = await signTestToken({ sub: 'user-1', email: 'regular@user.com' });
    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('rejects an authenticated user with no email claim (403)', async () => {
    const token = await signTestToken({ sub: 'user-2' });
    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  describe('as an admin', () => {
    let token: string;

    beforeAll(async () => {
      token = await signTestToken({ sub: 'admin-1', email: ADMIN_EMAIL });
    });

    it('GET /admin/stats returns the executive dashboard', async () => {
      adminService.getExecutiveDashboard.mockResolvedValue({ users: { total: 10 } });
      const res = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toEqual({ success: true, data: { users: { total: 10 } } });
    });

    it('GET /admin/audit-logs applies default limit/days when omitted', async () => {
      adminService.getAuditLogs.mockResolvedValue({ entries: [], total: 0 });
      await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(100, 30);
    });

    it('GET /admin/audit-logs parses provided limit/days query params', async () => {
      adminService.getAuditLogs.mockResolvedValue({ entries: [], total: 0 });
      await request(app.getHttpServer())
        .get('/admin/audit-logs?limit=25&days=7')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(25, 7);
    });

    it('GET /admin/analytics parses the days query param', async () => {
      adminService.getAnalytics.mockResolvedValue({ days: 14 });
      await request(app.getHttpServer())
        .get('/admin/analytics?days=14')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(adminService.getAnalytics).toHaveBeenCalledWith(14);
    });

    it('GET /admin/top-creators parses the limit query param', async () => {
      adminService.getTopCreators.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/admin/top-creators?limit=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(adminService.getTopCreators).toHaveBeenCalledWith(5);
    });

    it('GET /admin/clips-by-user parses the limit query param', async () => {
      adminService.getClipsByUser.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/admin/clips-by-user?limit=9')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(adminService.getClipsByUser).toHaveBeenCalledWith(9);
    });

    it('GET /admin/errors parses the limit query param', async () => {
      adminService.getErrors.mockResolvedValue({ entries: [], summary: {} });
      await request(app.getHttpServer())
        .get('/admin/errors?limit=11')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(adminService.getErrors).toHaveBeenCalledWith(11);
    });
  });
});
