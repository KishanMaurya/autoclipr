// jwt-auth.guard.ts (transitively imported via UsersController's @UseGuards) pulls in the
// ESM-only `jose` package, which Jest's CommonJS transform can't parse from node_modules.
// We never exercise real JWT verification in this unit test, so stub the module out.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InitAvatarUploadDto } from './dto/init-avatar-upload.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const user: AuthUser = { sub: 'user-1', email: 'jane@example.com' };

  beforeEach(async () => {
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
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = moduleRef.get(UsersController);
  });

  describe('me', () => {
    it('returns the wrapped profile for the current user', async () => {
      const profile = { id: 'user-1' };
      usersService.getMe.mockResolvedValue(profile as any);

      const result = await controller.me(user);

      expect(usersService.getMe).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true, data: profile, meta: undefined });
    });

    it('propagates a NotFoundException from the service', async () => {
      usersService.getMe.mockRejectedValue(new Error('not found'));

      await expect(controller.me(user)).rejects.toThrow('not found');
    });
  });

  describe('updateMe', () => {
    it('forwards the dto to the service and wraps the updated profile', async () => {
      const dto: UpdateProfileDto = { full_name: 'New Name' };
      const updated = { id: 'user-1', full_name: 'New Name' };
      usersService.updateProfile.mockResolvedValue(updated as any);

      const result = await controller.updateMe(user, dto);

      expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ success: true, data: updated, meta: undefined });
    });
  });

  describe('creditHistory', () => {
    it('returns the wrapped credit history', async () => {
      const history = [{ id: 'tx-1' }];
      usersService.getCreditHistory.mockResolvedValue(history as any);

      const result = await controller.creditHistory(user);

      expect(usersService.getCreditHistory).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true, data: history, meta: undefined });
    });
  });

  describe('heartbeat', () => {
    it('pings the service and returns ok:true', async () => {
      usersService.heartbeat.mockResolvedValue(undefined);

      const result = await controller.heartbeat(user);

      expect(usersService.heartbeat).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true, data: { ok: true }, meta: undefined });
    });
  });

  describe('initAvatarUpload', () => {
    it('forwards the dto and returns the wrapped upload URLs', async () => {
      const dto: InitAvatarUploadDto = { filename: 'a.png', mime_type: 'image/png', size: 100 };
      const uploadData = { upload_url: 'https://signed', avatar_url: 'https://public' };
      usersService.initAvatarUpload.mockResolvedValue(uploadData as any);

      const result = await controller.initAvatarUpload(user, dto);

      expect(usersService.initAvatarUpload).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ success: true, data: uploadData, meta: undefined });
    });
  });

  describe('deleteMe', () => {
    it('deletes the account and returns deleted:true', async () => {
      const dto: DeleteAccountDto = { confirm: 'DELETE' };
      usersService.deleteAccount.mockResolvedValue(undefined);

      const result = await controller.deleteMe(user, dto);

      expect(usersService.deleteAccount).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true, data: { deleted: true }, meta: undefined });
    });
  });
});
