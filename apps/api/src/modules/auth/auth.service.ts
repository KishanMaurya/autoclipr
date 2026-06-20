import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@autoclipr/emails';
import { resolvePhoneAvatar } from '../../common/phone-avatar';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async syncProfile(userId: string, userEmail: string, fullName = '', avatarUrl = '', phone = '') {
    const resolvedAvatar = phone ? resolvePhoneAvatar(phone, avatarUrl) : avatarUrl;
    const profile = await this.usersRepo.upsertFromAuth(userId, userEmail, fullName, resolvedAvatar, phone);

    // Send welcome email only on first registration (created_at within 30s of now)
    const age = Date.now() - new Date(profile.created_at).getTime();
    if (age < 30_000 && profile.email && profile.email_notifications_enabled !== false) {
      const appUrl = this.config.get<string>('webAppUrl') ?? 'https://autoclipr.com';
      void this.email.sendWelcome(profile.email, {
        userName: profile.full_name || profile.email.split('@')[0],
        dashboardUrl: `${appUrl}/dashboard`,
      });
    }

    return profile;
  }
}
