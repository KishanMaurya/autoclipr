// jwt-auth.guard.ts (transitively imported via UsersController's @UseGuards, which is
// applied at the controller level here) pulls in the ESM-only `jose` package, which Jest's
// CommonJS transform can't parse from node_modules. We stub it out — see MockJwtAuthGuard.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

class MockJwtAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'];
    if (!auth || auth !== 'Bearer valid-token') {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }
    req.user = { sub: 'user-1', email: 'jane@example.com' };
    return true;
  }
}

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let usersService: jest.Mocked<UsersService>;

  beforeAll(async () => {
    usersService = {
      getMe: jest.fn(),
      updateProfile: jest.fn(),
      getCreditHistory: jest.fn(),
      heartbeat: jest.fn(),
      initAvatarUpload: jest.fn(),
      deleteAccount: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/users/me', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
      expect(usersService.getMe).not.toHaveBeenCalled();
    });

    it('returns the wrapped profile for an authenticated user', async () => {
      const profile = { id: 'user-1', email: 'jane@example.com' };
      usersService.getMe.mockResolvedValue(profile as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(usersService.getMe).toHaveBeenCalledWith('user-1');
      expect(response.body).toEqual({ success: true, data: profile });
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer()).patch('/api/v1/users/me').send({}).expect(401);
    });

    it('updates the profile and returns the wrapped result', async () => {
      const updated = { id: 'user-1', full_name: 'New Name' };
      usersService.updateProfile.mockResolvedValue(updated as any);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ full_name: 'New Name' })
        .expect(200);

      expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', { full_name: 'New Name' });
      expect(response.body).toEqual({ success: true, data: updated });
    });

    it('returns 400 for an invalid email', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(usersService.updateProfile).not.toHaveBeenCalled();
    });

    it('returns 400 for a full_name shorter than 2 characters', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ full_name: 'A' })
        .expect(400);
    });
  });

  describe('GET /api/v1/users/me/credit-history', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me/credit-history').expect(401);
    });

    it('returns the wrapped credit history', async () => {
      usersService.getCreditHistory.mockResolvedValue([{ id: 'tx-1' }] as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me/credit-history')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(usersService.getCreditHistory).toHaveBeenCalledWith('user-1');
      expect(response.body).toEqual({ success: true, data: [{ id: 'tx-1' }] });
    });
  });

  describe('POST /api/v1/users/me/heartbeat', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer()).post('/api/v1/users/me/heartbeat').expect(401);
    });

    it('pings the service and returns ok:true', async () => {
      usersService.heartbeat.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/heartbeat')
        .set('Authorization', 'Bearer valid-token')
        .expect(201);

      expect(usersService.heartbeat).toHaveBeenCalledWith('user-1');
      expect(response.body).toEqual({ success: true, data: { ok: true } });
    });
  });

  describe('POST /api/v1/users/me/avatar/upload', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/me/avatar/upload')
        .send({ filename: 'a.png', mime_type: 'image/png', size: 100 })
        .expect(401);
    });

    it('returns the wrapped signed upload URL for a valid payload', async () => {
      const data = { upload_url: 'https://signed', avatar_url: 'https://public' };
      usersService.initAvatarUpload.mockResolvedValue(data as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/avatar/upload')
        .set('Authorization', 'Bearer valid-token')
        .send({ filename: 'a.png', mime_type: 'image/png', size: 100 })
        .expect(201);

      expect(usersService.initAvatarUpload).toHaveBeenCalledWith('user-1', {
        filename: 'a.png',
        mime_type: 'image/png',
        size: 100,
      });
      expect(response.body).toEqual({ success: true, data });
    });

    it('returns 400 when size exceeds the 2 MB maximum', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/me/avatar/upload')
        .set('Authorization', 'Bearer valid-token')
        .send({ filename: 'a.png', mime_type: 'image/png', size: 2 * 1024 * 1024 + 1 })
        .expect(400);

      expect(usersService.initAvatarUpload).not.toHaveBeenCalled();
    });

    it('returns 400 when a required field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/me/avatar/upload')
        .set('Authorization', 'Bearer valid-token')
        .send({ mime_type: 'image/png', size: 100 })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer()).delete('/api/v1/users/me').send({ confirm: 'DELETE' }).expect(401);
    });

    it('deletes the account when confirm=DELETE is sent', async () => {
      usersService.deleteAccount.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ confirm: 'DELETE' })
        .expect(200);

      expect(usersService.deleteAccount).toHaveBeenCalledWith('user-1');
      expect(response.body).toEqual({ success: true, data: { deleted: true } });
    });

    it('returns 400 when confirm is not exactly "DELETE"', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ confirm: 'delete' })
        .expect(400);

      expect(usersService.deleteAccount).not.toHaveBeenCalled();
    });

    it('returns 400 when confirm is missing entirely', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);
    });
  });
});
