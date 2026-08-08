import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@autoclipr/emails';
import { AuthService } from './auth.service';
import { UsersRepository, Profile } from '../users/users.repository';

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
    welcome_sent: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<UsersRepository>;
  let email: jest.Mocked<EmailService>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    usersRepo = {
      upsertFromAuth: jest.fn(),
      markWelcomeSent: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UsersRepository>;

    email = {
      sendWelcome: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailService>;

    config = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepo },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncProfile', () => {
    it('upserts the profile with defaulted optional args and returns it', async () => {
      const profile = makeProfile({ created_at: new Date(0), welcome_sent: true });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      const result = await service.syncProfile('user-1', 'jane@example.com');

      expect(usersRepo.upsertFromAuth).toHaveBeenCalledWith('user-1', 'jane@example.com', '', '', '');
      expect(result).toBe(profile);
    });

    it('passes fullName/avatarUrl straight through when no phone is given', async () => {
      const profile = makeProfile({ created_at: new Date(0), welcome_sent: true });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      await service.syncProfile('user-1', 'jane@example.com', 'Jane', 'https://cdn/avatar.png', '');

      expect(usersRepo.upsertFromAuth).toHaveBeenCalledWith(
        'user-1',
        'jane@example.com',
        'Jane',
        'https://cdn/avatar.png',
        '',
      );
    });

    it('resolves an emoji avatar from phone parity when a phone is given and no avatar url is set', async () => {
      const profile = makeProfile({ created_at: new Date(0), welcome_sent: true });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      // last digit 4 -> even -> girl emoji
      await service.syncProfile('user-1', 'jane@example.com', '', '', '+91987654');

      expect(usersRepo.upsertFromAuth).toHaveBeenCalledWith('user-1', 'jane@example.com', '', '👧', '+91987654');
    });

    it('resolves the boy emoji for a phone ending in an odd digit', async () => {
      const profile = makeProfile({ created_at: new Date(0), welcome_sent: true });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      await service.syncProfile('user-1', 'jane@example.com', '', '', '+91987651');

      expect(usersRepo.upsertFromAuth).toHaveBeenCalledWith('user-1', 'jane@example.com', '', '👦', '+91987651');
    });

    it('keeps a real (non-emoji-placeholder) avatar url even when phone is provided', async () => {
      const profile = makeProfile({ created_at: new Date(0), welcome_sent: true });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      await service.syncProfile('user-1', 'jane@example.com', '', 'https://cdn/real.png', '+91987654');

      expect(usersRepo.upsertFromAuth).toHaveBeenCalledWith(
        'user-1',
        'jane@example.com',
        '',
        'https://cdn/real.png',
        '+91987654',
      );
    });

    it('sends a welcome email and marks it sent for a brand new profile', async () => {
      const profile = makeProfile({ created_at: new Date(), welcome_sent: false, email: 'jane@example.com' });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);
      usersRepo.markWelcomeSent.mockResolvedValue(undefined);
      config.get.mockReturnValue(undefined);

      await service.syncProfile('user-1', 'jane@example.com');

      expect(email.sendWelcome).toHaveBeenCalledWith('jane@example.com', {
        userName: 'Jane Doe',
        dashboardUrl: 'https://autoclipr.com/dashboard',
      });
      expect(usersRepo.markWelcomeSent).toHaveBeenCalledWith('user-1');
    });

    it('uses the configured webAppUrl for the dashboard link when set', async () => {
      const profile = makeProfile({ created_at: new Date(), welcome_sent: false });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);
      config.get.mockReturnValue('https://app.autoclipr.com');

      await service.syncProfile('user-1', 'jane@example.com');

      expect(email.sendWelcome).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ dashboardUrl: 'https://app.autoclipr.com/dashboard' }),
      );
    });

    it('falls back to the email local-part as userName when full_name is empty', async () => {
      const profile = makeProfile({ created_at: new Date(), welcome_sent: false, full_name: null as any, email: 'noname@example.com' });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);
      config.get.mockReturnValue(undefined);

      await service.syncProfile('user-1', 'noname@example.com');

      expect(email.sendWelcome).toHaveBeenCalledWith(
        'noname@example.com',
        expect.objectContaining({ userName: 'noname' }),
      );
    });

    it('does not send a welcome email when the profile is older than 24h', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const profile = makeProfile({ created_at: oldDate, welcome_sent: false });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      await service.syncProfile('user-1', 'jane@example.com');

      expect(email.sendWelcome).not.toHaveBeenCalled();
      expect(usersRepo.markWelcomeSent).not.toHaveBeenCalled();
    });

    it('does not send a welcome email when welcome_sent is already true', async () => {
      const profile = makeProfile({ created_at: new Date(), welcome_sent: true });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      await service.syncProfile('user-1', 'jane@example.com');

      expect(email.sendWelcome).not.toHaveBeenCalled();
    });

    it('does not send a welcome email when the profile has no email', async () => {
      const profile = makeProfile({ created_at: new Date(), welcome_sent: false, email: '' });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      await service.syncProfile('user-1', '');

      expect(email.sendWelcome).not.toHaveBeenCalled();
    });

    it('does not send a welcome email when email_notifications_enabled is false', async () => {
      const profile = makeProfile({ created_at: new Date(), welcome_sent: false, email_notifications_enabled: false });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      await service.syncProfile('user-1', 'jane@example.com');

      expect(email.sendWelcome).not.toHaveBeenCalled();
    });

    it('still sends a welcome email when email_notifications_enabled is undefined (only false suppresses it)', async () => {
      const profile = makeProfile({
        created_at: new Date(),
        welcome_sent: false,
        email_notifications_enabled: undefined as any,
      });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);

      await service.syncProfile('user-1', 'jane@example.com');

      expect(email.sendWelcome).toHaveBeenCalled();
    });

    it('swallows markWelcomeSent failures without rejecting syncProfile', async () => {
      const profile = makeProfile({ created_at: new Date(), welcome_sent: false });
      usersRepo.upsertFromAuth.mockResolvedValue(profile);
      usersRepo.markWelcomeSent.mockRejectedValue(new Error('db down'));

      await expect(service.syncProfile('user-1', 'jane@example.com')).resolves.toBe(profile);
    });

    it('propagates errors from the repository upsert', async () => {
      usersRepo.upsertFromAuth.mockRejectedValue(new Error('upsert failed'));

      await expect(service.syncProfile('user-1', 'jane@example.com')).rejects.toThrow('upsert failed');
      expect(email.sendWelcome).not.toHaveBeenCalled();
    });
  });
});
