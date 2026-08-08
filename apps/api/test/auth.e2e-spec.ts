// jwt-auth.guard.ts (transitively imported via AuthController's @UseGuards) pulls in the
// ESM-only `jose` package, which Jest's CommonJS transform can't parse from node_modules.
// We never exercise real JWT verification here — see MockJwtAuthGuard below — so stub it out.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

/**
 * Stands in for the real JwtAuthGuard: rejects requests without a well-formed
 * Bearer token (401, matching the real guard's behavior) and otherwise attaches
 * a fixed AuthUser to the request, exactly like a verified JWT would.
 */
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

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;

  beforeAll(async () => {
    authService = {
      syncProfile: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
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

  describe('POST /api/v1/auth/sync', () => {
    it('returns 401 when no Authorization header is sent', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/sync')
        .send({})
        .expect(401);

      expect(authService.syncProfile).not.toHaveBeenCalled();
    });

    it('returns 401 for a malformed/invalid Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer garbage')
        .send({})
        .expect(401);

      expect(authService.syncProfile).not.toHaveBeenCalled();
    });

    it('syncs the profile and returns 201 with the wrapped result for a valid token', async () => {
      const profile = { id: 'user-1', email: 'jane@example.com', full_name: 'Jane' };
      authService.syncProfile.mockResolvedValue(profile as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ full_name: 'Jane', avatar_url: 'https://cdn/a.png', phone: '+1234' })
        .expect(201);

      expect(authService.syncProfile).toHaveBeenCalledWith(
        'user-1',
        'jane@example.com',
        'Jane',
        'https://cdn/a.png',
        '+1234',
      );
      expect(response.body).toEqual({ success: true, data: profile });
    });

    it('accepts an empty body (all sync-profile fields are optional)', async () => {
      authService.syncProfile.mockResolvedValue({} as any);

      await request(app.getHttpServer())
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(201);

      expect(authService.syncProfile).toHaveBeenCalledWith('user-1', 'jane@example.com', '', '', '');
    });

    it('returns 400 when a field has the wrong type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ full_name: 12345 })
        .expect(400);

      expect(authService.syncProfile).not.toHaveBeenCalled();
    });

    it('strips unknown fields instead of rejecting the request (whitelist mode)', async () => {
      authService.syncProfile.mockResolvedValue({} as any);

      await request(app.getHttpServer())
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ full_name: 'Jane', not_a_real_field: 'x' })
        .expect(201);

      expect(authService.syncProfile).toHaveBeenCalledWith('user-1', 'jane@example.com', 'Jane', '', '');
    });

    it('returns 500 when the service throws', async () => {
      authService.syncProfile.mockRejectedValue(new Error('db down'));

      await request(app.getHttpServer())
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(500);
    });
  });
});
