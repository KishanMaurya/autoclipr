import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailService } from '@autoclipr/emails';
import { UsersService } from './users.service';
import { UsersRepository, Profile } from './users.repository';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { StorageService } from '../storage/storage.service';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    email: 'jane@example.com',
    full_name: 'Jane Doe',
    avatar_url: null,
    phone: null,
    credits: 30,
    subscription_tier: 'starter',
    email_notifications_enabled: true,
    welcome_sent: true,
    created_at: new Date(0),
    updated_at: new Date(0),
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: jest.Mocked<UsersRepository>;
  let config: jest.Mocked<ConfigService>;
  let supabaseAdmin: any;
  let storage: jest.Mocked<StorageService>;
  let email: jest.Mocked<EmailService>;

  beforeEach(async () => {
    usersRepo = {
      getById: jest.fn(),
      upsertFromAuth: jest.fn(),
      ensureProfile: jest.fn(),
      updateProfile: jest.fn(),
      deductCredits: jest.fn(),
      listCreditTransactions: jest.fn(),
      getSubscription: jest.fn(),
      heartbeat: jest.fn(),
      markWelcomeSent: jest.fn(),
      listPlans: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    config = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;

    const defaultClient = {
      auth: {
        admin: {
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
          updateUserById: jest.fn().mockResolvedValue({ error: null }),
        },
      },
    };
    supabaseAdmin = {
      getClient: jest.fn(() => defaultClient),
    };

    storage = {
      avatarsBucket: jest.fn().mockReturnValue('avatars'),
      createSignedUploadUrl: jest.fn(),
      getPublicObjectUrl: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    email = {
      sendAccountDeleted: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepo },
        { provide: ConfigService, useValue: config },
        { provide: SupabaseAdminService, useValue: supabaseAdmin },
        { provide: StorageService, useValue: storage },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('getMe', () => {
    it('returns the profile with the configured clip credit cost', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile());
      config.get.mockReturnValue(2);

      const result = await service.getMe('user-1');

      expect(result.clip_credit_cost).toBe(2);
      expect(result.id).toBe('user-1');
    });

    it('defaults clip_credit_cost to 1 when unset', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile());
      config.get.mockReturnValue(undefined);

      const result = await service.getMe('user-1');

      expect(result.clip_credit_cost).toBe(1);
    });

    it('throws NotFoundException when the profile does not exist', async () => {
      usersRepo.getById.mockResolvedValue(null);

      await expect(service.getMe('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBilling', () => {
    it('combines the profile and subscription', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ credits: 42 }));
      usersRepo.getSubscription.mockResolvedValue({ id: 'sub-1' } as any);
      config.get.mockReturnValue(1);

      const result = await service.getBilling('user-1');

      expect(result.subscription).toEqual({ id: 'sub-1' });
      expect(result.credits).toBe(42);
      expect(result.profile.id).toBe('user-1');
    });

    it('propagates NotFoundException when the profile is missing', async () => {
      usersRepo.getById.mockResolvedValue(null);

      await expect(service.getBilling('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listPlans', () => {
    it('delegates to the repository', () => {
      usersRepo.listPlans.mockResolvedValue([{ id: 'starter' }] as any);

      const result = service.listPlans();

      expect(usersRepo.listPlans).toHaveBeenCalled();
      return expect(result).resolves.toEqual([{ id: 'starter' }]);
    });
  });

  describe('getCreditHistory', () => {
    it('delegates to the repository', async () => {
      usersRepo.listCreditTransactions.mockResolvedValue([{ id: 'tx-1' }] as any);

      const result = await service.getCreditHistory('user-1');

      expect(usersRepo.listCreditTransactions).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([{ id: 'tx-1' }]);
    });
  });

  describe('deleteAccount', () => {
    it('sends a goodbye email and deletes the auth user', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ email: 'jane@example.com', full_name: 'Jane Doe' }));

      await service.deleteAccount('user-1');

      expect(email.sendAccountDeleted).toHaveBeenCalledWith('jane@example.com', {
        userName: 'Jane Doe',
        email: 'jane@example.com',
      });
      expect(supabaseAdmin.getClient().auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('falls back to the email local-part as userName when full_name is empty', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ email: 'noname@example.com', full_name: null }));

      await service.deleteAccount('user-1');

      expect(email.sendAccountDeleted).toHaveBeenCalledWith(
        'noname@example.com',
        expect.objectContaining({ userName: 'noname' }),
      );
    });

    it('skips the goodbye email when notifications are disabled', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ email_notifications_enabled: false }));

      await service.deleteAccount('user-1');

      expect(email.sendAccountDeleted).not.toHaveBeenCalled();
    });

    it('skips the goodbye email when there is no email on file', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ email: '' }));

      await service.deleteAccount('user-1');

      expect(email.sendAccountDeleted).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the profile does not exist', async () => {
      usersRepo.getById.mockResolvedValue(null);

      await expect(service.deleteAccount('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws when the Supabase admin deleteUser call fails', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile());
      supabaseAdmin.getClient.mockReturnValue({
        auth: { admin: { deleteUser: jest.fn().mockResolvedValue({ error: { message: 'delete failed' } }) } },
      });

      await expect(service.deleteAccount('user-1')).rejects.toThrow('delete failed');
    });
  });

  describe('updateProfile', () => {
    it('throws NotFoundException when the profile does not exist', async () => {
      usersRepo.getById.mockResolvedValue(null);

      await expect(service.updateProfile('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('updates auth user_metadata when full_name changes and forwards the patch to the repo', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile());
      usersRepo.updateProfile.mockResolvedValue(makeProfile({ full_name: 'New Name' }));
      const deleteUser = jest.fn();
      const updateUserById = jest.fn().mockResolvedValue({ error: null });
      supabaseAdmin.getClient.mockReturnValue({ auth: { admin: { deleteUser, updateUserById } } });

      await service.updateProfile('user-1', { full_name: 'New Name' });

      expect(updateUserById).toHaveBeenCalledWith('user-1', { user_metadata: { full_name: 'New Name' } });
      expect(usersRepo.updateProfile).toHaveBeenCalledWith('user-1', {
        full_name: 'New Name',
        email: 'jane@example.com',
        avatar_url: undefined,
        email_notifications_enabled: undefined,
      });
    });

    it('validates and sets a trimmed, allow-listed avatar_url', async () => {
      config.get.mockReturnValue('https://supabase.example.com');
      storage.avatarsBucket.mockReturnValue('avatars');
      const allowedUrl = 'https://supabase.example.com/storage/v1/object/public/avatars/user-1/avatar.png';
      usersRepo.getById.mockResolvedValue(makeProfile());
      usersRepo.updateProfile.mockResolvedValue(makeProfile({ avatar_url: allowedUrl }));
      const updateUserById = jest.fn().mockResolvedValue({ error: null });
      supabaseAdmin.getClient.mockReturnValue({ auth: { admin: { deleteUser: jest.fn(), updateUserById } } });

      await service.updateProfile('user-1', { avatar_url: `  ${allowedUrl}  ` });

      expect(updateUserById).toHaveBeenCalledWith('user-1', { user_metadata: { avatar_url: allowedUrl } });
      expect(usersRepo.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ avatar_url: allowedUrl }),
      );
    });

    it('rejects any avatar_url when supabaseUrl is not configured (empty prefix)', async () => {
      config.get.mockReturnValue(undefined);
      storage.avatarsBucket.mockReturnValue('avatars');
      usersRepo.getById.mockResolvedValue(makeProfile());

      await expect(
        service.updateProfile('user-1', { avatar_url: 'https://cdn.example.com/avatar.png' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an avatar_url outside the Supabase storage bucket prefix', async () => {
      config.get.mockReturnValue('https://supabase.example.com');
      storage.avatarsBucket.mockReturnValue('avatars');
      usersRepo.getById.mockResolvedValue(makeProfile());

      await expect(
        service.updateProfile('user-1', { avatar_url: 'https://evil.example.com/avatar.png' }),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepo.updateProfile).not.toHaveBeenCalled();
    });

    it('clears the avatar when avatar_url is an empty/whitespace string', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile());
      usersRepo.updateProfile.mockResolvedValue(makeProfile({ avatar_url: null }));
      const updateUserById = jest.fn().mockResolvedValue({ error: null });
      supabaseAdmin.getClient.mockReturnValue({ auth: { admin: { deleteUser: jest.fn(), updateUserById } } });

      await service.updateProfile('user-1', { avatar_url: '   ' });

      expect(updateUserById).toHaveBeenCalledWith('user-1', { user_metadata: { avatar_url: '' } });
      expect(usersRepo.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ avatar_url: null }),
      );
    });

    it('updates auth email only when it differs from the existing profile email', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ email: 'jane@example.com' }));
      usersRepo.updateProfile.mockResolvedValue(makeProfile({ email: 'jane@example.com' }));
      const updateUserById = jest.fn().mockResolvedValue({ error: null });
      supabaseAdmin.getClient.mockReturnValue({ auth: { admin: { deleteUser: jest.fn(), updateUserById } } });

      await service.updateProfile('user-1', { email: 'jane@example.com' });

      expect(updateUserById).not.toHaveBeenCalled();
    });

    it('updates auth email when it differs from the existing profile email', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ email: 'old@example.com' }));
      usersRepo.updateProfile.mockResolvedValue(makeProfile({ email: 'new@example.com' }));
      const updateUserById = jest.fn().mockResolvedValue({ error: null });
      supabaseAdmin.getClient.mockReturnValue({ auth: { admin: { deleteUser: jest.fn(), updateUserById } } });

      await service.updateProfile('user-1', { email: 'new@example.com' });

      expect(updateUserById).toHaveBeenCalledWith('user-1', { email: 'new@example.com' });
    });

    it('skips the auth admin call entirely when nothing changed', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ email: 'jane@example.com' }));
      usersRepo.updateProfile.mockResolvedValue(makeProfile());
      const updateUserById = jest.fn();
      supabaseAdmin.getClient.mockReturnValue({ auth: { admin: { deleteUser: jest.fn(), updateUserById } } });

      await service.updateProfile('user-1', {});

      expect(updateUserById).not.toHaveBeenCalled();
      expect(usersRepo.updateProfile).toHaveBeenCalledWith('user-1', {
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        avatar_url: undefined,
        email_notifications_enabled: undefined,
      });
    });

    it('passes full_name=undefined through when neither the dto nor the existing profile has one', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ full_name: null }));
      usersRepo.updateProfile.mockResolvedValue(makeProfile({ full_name: null }));
      const updateUserById = jest.fn();
      supabaseAdmin.getClient.mockReturnValue({ auth: { admin: { deleteUser: jest.fn(), updateUserById } } });

      await service.updateProfile('user-1', {});

      expect(usersRepo.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ full_name: undefined }),
      );
    });

    it('throws when the auth admin update call fails', async () => {
      usersRepo.getById.mockResolvedValue(makeProfile({ email: 'old@example.com' }));
      const updateUserById = jest.fn().mockResolvedValue({ error: { message: 'auth update failed' } });
      supabaseAdmin.getClient.mockReturnValue({ auth: { admin: { deleteUser: jest.fn(), updateUserById } } });

      await expect(service.updateProfile('user-1', { email: 'new@example.com' })).rejects.toThrow(
        'auth update failed',
      );
      expect(usersRepo.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('initAvatarUpload', () => {
    const validDto = { filename: 'a.png', mime_type: 'image/png', size: 1024 };

    it('creates a signed upload URL for an allowed image type', async () => {
      storage.avatarsBucket.mockReturnValue('avatars');
      storage.createSignedUploadUrl.mockResolvedValue({ signedUrl: 'https://signed', path: 'user-1/avatar.png' });
      storage.getPublicObjectUrl.mockReturnValue('https://public/avatar.png');

      const result = await service.initAvatarUpload('user-1', validDto);

      expect(storage.createSignedUploadUrl).toHaveBeenCalledWith('user-1/avatar.png', 'avatars');
      expect(result).toEqual({ upload_url: 'https://signed', avatar_url: 'https://public/avatar.png' });
    });

    it.each([
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
    ])('maps mime type %s to extension %s', async (mimeType, ext) => {
      storage.avatarsBucket.mockReturnValue('avatars');
      storage.createSignedUploadUrl.mockResolvedValue({ signedUrl: 'https://signed', path: '' });
      storage.getPublicObjectUrl.mockReturnValue('https://public');

      await service.initAvatarUpload('user-1', { ...validDto, mime_type: mimeType });

      expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(`user-1/avatar.${ext}`, 'avatars');
    });

    it('rejects an unsupported mime type', async () => {
      await expect(
        service.initAvatarUpload('user-1', { ...validDto, mime_type: 'image/gif' }),
      ).rejects.toThrow(BadRequestException);
      expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('rejects a file over the 2 MB size limit', async () => {
      await expect(
        service.initAvatarUpload('user-1', { ...validDto, size: 2 * 1024 * 1024 + 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('accepts a file at exactly the 2 MB boundary', async () => {
      storage.avatarsBucket.mockReturnValue('avatars');
      storage.createSignedUploadUrl.mockResolvedValue({ signedUrl: 'https://signed', path: '' });
      storage.getPublicObjectUrl.mockReturnValue('https://public');

      await expect(
        service.initAvatarUpload('user-1', { ...validDto, size: 2 * 1024 * 1024 }),
      ).resolves.toBeDefined();
    });
  });

  describe('heartbeat', () => {
    it('delegates to the repository', async () => {
      await service.heartbeat('user-1');

      expect(usersRepo.heartbeat).toHaveBeenCalledWith('user-1');
    });
  });
});
