import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EmailService } from '@autoclipr/emails';
import { ConnectPlatformDto, type PlatformId } from './dto/platform.dto';
import { PlatformsRepository } from './platforms.repository';
import { UsersRepository } from '../users/users.repository';

const PLATFORM_LABELS: Record<PlatformId, string> = {
  youtube: 'YouTube Shorts',
  instagram: 'Instagram Reels',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

@Injectable()
export class PlatformsService {
  constructor(
    private readonly platformsRepo: PlatformsRepository,
    private readonly config: ConfigService,
    private readonly usersRepo: UsersRepository,
    private readonly email: EmailService,
  ) {}

  list(userId: string) {
    return this.platformsRepo.listByUser(userId).then((rows) =>
      rows.map((row) => ({
        ...row,
        platform_label: PLATFORM_LABELS[row.platform] ?? row.platform,
        can_post: row.auth_status === 'authorized' && row.has_tokens,
        oauth_available: this.isOAuthConfigured(row.platform),
      })),
    );
  }

  async connect(userId: string, dto: ConnectPlatformDto) {
    if (dto.platform === 'tiktok') {
      throw new BadRequestException('TikTok posting is not available yet');
    }

    const existing = await this.platformsRepo.getByPlatform(userId, dto.platform);

    const row = await this.platformsRepo.upsert({
      user_id: userId,
      platform: dto.platform,
      account_name: dto.account_name ?? existing?.account_name ?? PLATFORM_LABELS[dto.platform],
      auth_status:
        existing?.auth_status === 'authorized' && existing.access_token
          ? 'authorized'
          : 'connected',
      access_token: existing?.access_token ?? undefined,
      refresh_token: existing?.refresh_token ?? undefined,
      token_expires_at: existing?.token_expires_at ?? undefined,
    });

    // Only send for non-YouTube platforms (YouTube sends after OAuth callback)
    if (dto.platform !== 'youtube') {
      void this.usersRepo.getById(userId).then((profile) => {
        if (profile?.email && profile.email_notifications_enabled !== false) {
          void this.email.sendPlatformConnected(profile.email, {
            userName: profile.full_name || profile.email.split('@')[0],
            platformName: PLATFORM_LABELS[dto.platform],
            accountName: row.account_name,
          });
        }
      });
    }

    return {
      ...row,
      platform_label: PLATFORM_LABELS[row.platform],
      can_post: row.auth_status === 'authorized' && row.has_tokens,
      oauth_available: this.isOAuthConfigured(row.platform),
      oauth_url:
        dto.platform === 'youtube' && this.isOAuthConfigured('youtube')
          ? this.buildYoutubeOAuthUrl(userId)
          : null,
    };
  }

  async disconnect(userId: string, platform: PlatformId) {
    const removed = await this.platformsRepo.delete(userId, platform);
    if (!removed) throw new NotFoundException('Platform connection not found');
    return { removed: true };
  }

  getYoutubeOAuthUrl(userId: string) {
    if (!this.isOAuthConfigured('youtube')) {
      throw new BadRequestException(
        'YouTube OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env',
      );
    }
    return { url: this.buildYoutubeOAuthUrl(userId) };
  }

  async handleYoutubeCallback(code: string, state: string) {
    const userId = this.verifyOAuthState(state, 'youtube');
    const tokens = await this.exchangeGoogleCode(code);

    let accountName = 'YouTube Channel';
    let accountId: string | null = null;
    try {
      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (channelRes.ok) {
        const body = (await channelRes.json()) as {
          items?: Array<{ id?: string; snippet?: { title?: string } }>;
        };
        accountId = body.items?.[0]?.id ?? null;
        accountName = body.items?.[0]?.snippet?.title ?? accountName;
      }
    } catch {
      // optional metadata
    }

    await this.platformsRepo.saveOAuthTokens(userId, 'youtube', {
      account_name: accountName,
      account_id: accountId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: tokens.expires_at,
    });

    // Fire-and-forget: notify user of successful YouTube connection
    void this.usersRepo.getById(userId).then((profile) => {
      if (profile?.email && profile.email_notifications_enabled !== false) {
        void this.email.sendPlatformConnected(profile.email, {
          userName: profile.full_name || profile.email.split('@')[0],
          platformName: 'YouTube Shorts',
          accountName,
        });
      }
    });

    const webUrl = this.config.get<string>('webAppUrl') ?? 'http://localhost:3000';
    return `${webUrl}/setup/platforms?from=oauth&platform=youtube&status=success`;
  }

  private isOAuthConfigured(platform: PlatformId): boolean {
    if (platform === 'youtube') {
      return !!(
        this.config.get<string>('googleClientId') &&
        this.config.get<string>('googleClientSecret')
      );
    }
    return false;
  }

  private buildYoutubeOAuthUrl(userId: string): string {
    const clientId = this.config.get<string>('googleClientId')!;
    const redirectUri = this.getGoogleRedirectUri();
    const state = this.createOAuthState(userId, 'youtube');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: YOUTUBE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private getGoogleRedirectUri(): string {
    return (
      this.config.get<string>('googleRedirectUri') ??
      `${this.config.get<string>('apiPublicUrl') ?? 'http://localhost:8080'}/api/v1/platforms/youtube/callback`
    );
  }

  private createOAuthState(userId: string, platform: PlatformId): string {
    const secret = this.config.get<string>('jwtSecret') ?? 'autoclipr-oauth';
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = JSON.stringify({ userId, platform, nonce });
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url');
  }

  private verifyOAuthState(state: string, platform: PlatformId): string {
    try {
      const decoded = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      ) as { payload?: string; sig?: string };

      if (!decoded.payload || !decoded.sig) {
        throw new Error('Missing state fields');
      }

      const secret = this.config.get<string>('jwtSecret') ?? 'autoclipr-oauth';
      const expected = crypto
        .createHmac('sha256', secret)
        .update(decoded.payload)
        .digest('hex');

      if (decoded.sig !== expected) {
        throw new Error('Invalid signature');
      }

      const data = JSON.parse(decoded.payload) as {
        userId?: string;
        platform?: PlatformId;
      };

      if (!data.userId || data.platform !== platform) {
        throw new Error('Invalid payload');
      }

      return data.userId;
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }
  }

  private async exchangeGoogleCode(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_at: string | null;
  }> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.get<string>('googleClientId') ?? '',
        client_secret: this.config.get<string>('googleClientSecret') ?? '',
        redirect_uri: this.getGoogleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`Google OAuth failed: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresAt =
      data.expires_in != null
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null;

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    };
  }
}
