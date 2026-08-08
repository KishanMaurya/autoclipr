// jwt-auth.guard.ts (transitively imported via AuthController's @UseGuards decorator)
// pulls in the ESM-only `jose` package, which Jest's CommonJS transform can't
// parse from node_modules. We never exercise real JWT verification in this unit
// test, so stub the module out before anything imports it.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SyncProfileDto } from './dto/sync-profile.dto';
import { AuthUser, JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    authService = {
      syncProfile: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = moduleRef.get(AuthController);
  });

  describe('sync', () => {
    const user: AuthUser = { sub: 'user-1', email: 'jane@example.com' };

    it('forwards the resolved user id/email and dto fields to the service and wraps the result', async () => {
      const profile = { id: 'user-1' };
      authService.syncProfile.mockResolvedValue(profile as any);
      const dto: SyncProfileDto = { full_name: 'Jane', avatar_url: 'https://cdn/a.png', phone: '+1234' };

      const result = await controller.sync(user, dto);

      expect(authService.syncProfile).toHaveBeenCalledWith(
        'user-1',
        'jane@example.com',
        'Jane',
        'https://cdn/a.png',
        '+1234',
      );
      expect(result).toEqual({ success: true, data: profile, meta: undefined });
    });

    it('defaults missing dto fields to empty strings', async () => {
      authService.syncProfile.mockResolvedValue({} as any);

      await controller.sync(user, {});

      expect(authService.syncProfile).toHaveBeenCalledWith('user-1', 'jane@example.com', '', '', '');
    });

    it('defaults a missing user email to an empty string', async () => {
      authService.syncProfile.mockResolvedValue({} as any);
      const userWithoutEmail: AuthUser = { sub: 'user-2' };

      await controller.sync(userWithoutEmail, {});

      expect(authService.syncProfile).toHaveBeenCalledWith('user-2', '', '', '', '');
    });

    it('propagates errors from the service', async () => {
      authService.syncProfile.mockRejectedValue(new Error('boom'));

      await expect(controller.sync(user, {})).rejects.toThrow('boom');
    });
  });
});
