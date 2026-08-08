import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformsService } from './platforms.service';
import { PlatformsRepository } from './platforms.repository';
import { UsersRepository } from '../users/users.repository';

type ConfigMap = Record<string, string | undefined>;

function makeConfig(map: ConfigMap) {
  return { get: jest.fn((key: string) => map[key]) };
}

function makeRepo() {
  return {
    listByUser: jest.fn(),
    getByPlatform: jest.fn(),
    upsert: jest.fn(),
    saveOAuthTokens: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<PlatformsRepository>;
}

function makeUsersRepo() {
  return {
    upsertFromAuth: jest.fn(),
    getById: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
}

function makeEmail() {
  return { sendPlatformConnected: jest.fn().mockResolvedValue(undefined) };
}

const FULL_CONFIG: ConfigMap = {
  googleClientId: 'google-client-id',
  googleClientSecret: 'google-client-secret',
  metaAppId: 'meta-app-id',
  metaAppSecret: 'meta-app-secret',
  webAppUrl: 'https://app.example.com',
  apiPublicUrl: 'https://api.example.com',
  googleRedirectUri: undefined,
  metaRedirectUri: undefined,
  jwtSecret: 'test-secret',
};

describe('PlatformsService', () => {
  let repo: jest.Mocked<PlatformsRepository>;
  let usersRepo: jest.Mocked<UsersRepository>;
  let email: ReturnType<typeof makeEmail>;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    repo = makeRepo();
    usersRepo = makeUsersRepo();
    email = makeEmail();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function makeService(config: ConfigMap = FULL_CONFIG) {
    return new PlatformsService(
      repo,
      makeConfig(config) as never,
      usersRepo,
      email as never,
    );
  }

  describe('list', () => {
    it('maps platform label, can_post, and oauth_available per row', async () => {
      repo.listByUser.mockResolvedValue([
        {
          id: '1',
          user_id: 'u1',
          platform: 'youtube',
          account_name: 'Chan',
          account_id: 'c1',
          token_expires_at: null,
          auth_status: 'authorized',
          metadata: {},
          created_at: 'c',
          updated_at: 'u',
          has_tokens: true,
        } as never,
        {
          id: '2',
          user_id: 'u1',
          platform: 'tiktok',
          account_name: null,
          account_id: null,
          token_expires_at: null,
          auth_status: 'connected',
          metadata: {},
          created_at: 'c',
          updated_at: 'u',
          has_tokens: false,
        } as never,
      ]);

      const service = makeService();
      const result = await service.list('u1');

      expect(result).toEqual([
        expect.objectContaining({
          platform: 'youtube',
          platform_label: 'YouTube Shorts',
          can_post: true,
          oauth_available: true,
        }),
        expect.objectContaining({
          platform: 'tiktok',
          platform_label: 'TikTok',
          can_post: false,
          oauth_available: false,
        }),
      ]);
    });

    it('falls back to raw platform value when label is unknown', async () => {
      repo.listByUser.mockResolvedValue([
        {
          platform: 'mystery',
          auth_status: 'connected',
          has_tokens: false,
        } as never,
      ]);
      const service = makeService();
      const result = await service.list('u1');
      expect(result[0].platform_label).toBe('mystery');
    });

    it('can_post is false when authorized but no tokens', async () => {
      repo.listByUser.mockResolvedValue([
        { platform: 'youtube', auth_status: 'authorized', has_tokens: false } as never,
      ]);
      const service = makeService();
      const result = await service.list('u1');
      expect(result[0].can_post).toBe(false);
    });
  });

  describe('connect', () => {
    it('rejects tiktok', async () => {
      const service = makeService();
      await expect(
        service.connect('u1', { platform: 'tiktok' } as never, 'a@b.com'),
      ).rejects.toThrow(BadRequestException);
      expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('ensures profile exists and swallows upsertFromAuth failures', async () => {
      usersRepo.upsertFromAuth.mockRejectedValue(new Error('sync failed'));
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'facebook',
        account_name: 'Facebook',
        auth_status: 'connected',
        has_tokens: false,
      } as never);
      usersRepo.getById.mockResolvedValue({
        email: 'a@b.com',
        email_notifications_enabled: true,
        full_name: null,
      } as never);

      const service = makeService();
      await expect(
        service.connect('u1', { platform: 'facebook' } as never, 'a@b.com'),
      ).resolves.toBeDefined();
      expect(usersRepo.upsertFromAuth).toHaveBeenCalledWith('u1', 'a@b.com', '', '');
    });

    it('carries forward existing auth_status/tokens when previously authorized', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue({
        account_name: 'Existing',
        auth_status: 'authorized',
        access_token: 'tok',
        refresh_token: 'rtok',
        token_expires_at: 'exp',
      } as never);
      repo.upsert.mockResolvedValue({
        platform: 'facebook',
        account_name: 'Existing',
        auth_status: 'authorized',
        has_tokens: true,
      } as never);
      usersRepo.getById.mockResolvedValue(null);

      const service = makeService();
      await service.connect('u1', { platform: 'facebook' } as never, 'a@b.com');

      expect(repo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          auth_status: 'authorized',
          access_token: 'tok',
          refresh_token: 'rtok',
          token_expires_at: 'exp',
        }),
      );
    });

    it('downgrades to connected status when previously not authorized', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue({
        account_name: 'Existing',
        auth_status: 'connected',
        access_token: null,
      } as never);
      repo.upsert.mockResolvedValue({
        platform: 'facebook',
        account_name: 'Existing',
        auth_status: 'connected',
        has_tokens: false,
      } as never);
      usersRepo.getById.mockResolvedValue(null);

      const service = makeService();
      await service.connect('u1', { platform: 'facebook' } as never, 'a@b.com');

      expect(repo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ auth_status: 'connected' }),
      );
    });

    it('sends platform-connected email for non-youtube platforms when notifications enabled', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'facebook',
        account_name: 'My FB',
        auth_status: 'connected',
        has_tokens: false,
      } as never);
      usersRepo.getById.mockResolvedValue({
        email: 'a@b.com',
        full_name: 'Al Ice',
        email_notifications_enabled: true,
      } as never);

      const service = makeService();
      await service.connect('u1', { platform: 'facebook' } as never, 'a@b.com');
      // fire-and-forget email dispatch — flush microtasks
      await Promise.resolve();
      await Promise.resolve();

      expect(email.sendPlatformConnected).toHaveBeenCalledWith('a@b.com', {
        userName: 'Al Ice',
        platformName: 'Facebook',
        accountName: 'My FB',
      });
    });

    it('falls back to the platform label as accountName in the email when row.account_name is null', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'facebook',
        account_name: null,
        auth_status: 'connected',
        has_tokens: false,
      } as never);
      usersRepo.getById.mockResolvedValue({
        email: 'a@b.com',
        full_name: null,
        email_notifications_enabled: true,
      } as never);

      const service = makeService();
      await service.connect('u1', { platform: 'facebook' } as never, 'a@b.com');
      await Promise.resolve();
      await Promise.resolve();

      expect(email.sendPlatformConnected).toHaveBeenCalledWith(
        'a@b.com',
        expect.objectContaining({ accountName: 'Facebook' }),
      );
    });

    it('does not send email when notifications are disabled', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'facebook',
        account_name: 'My FB',
        auth_status: 'connected',
        has_tokens: false,
      } as never);
      usersRepo.getById.mockResolvedValue({
        email: 'a@b.com',
        email_notifications_enabled: false,
      } as never);

      const service = makeService();
      await service.connect('u1', { platform: 'facebook' } as never, 'a@b.com');
      await Promise.resolve();
      await Promise.resolve();

      expect(email.sendPlatformConnected).not.toHaveBeenCalled();
    });

    it('does not send email when profile has no email', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'facebook',
        auth_status: 'connected',
        has_tokens: false,
      } as never);
      usersRepo.getById.mockResolvedValue({ email: null } as never);

      const service = makeService();
      await service.connect('u1', { platform: 'facebook' } as never, 'a@b.com');
      await Promise.resolve();
      await Promise.resolve();

      expect(email.sendPlatformConnected).not.toHaveBeenCalled();
    });

    it('does not send email for youtube (sent after OAuth callback instead)', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'youtube',
        auth_status: 'connected',
        has_tokens: false,
      } as never);

      const service = makeService();
      await service.connect('u1', { platform: 'youtube' } as never, 'a@b.com');
      await Promise.resolve();

      expect(usersRepo.getById).not.toHaveBeenCalled();
      expect(email.sendPlatformConnected).not.toHaveBeenCalled();
    });

    it('includes a youtube oauth_url when configured', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'youtube',
        auth_status: 'connected',
        has_tokens: false,
      } as never);

      const service = makeService();
      const result = await service.connect('u1', { platform: 'youtube' } as never, 'a@b.com');

      expect(result.oauth_url).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
    });

    it('includes an instagram oauth_url when configured', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'instagram',
        auth_status: 'connected',
        has_tokens: false,
      } as never);
      usersRepo.getById.mockResolvedValue(null);

      const service = makeService();
      const result = await service.connect('u1', { platform: 'instagram' } as never, 'a@b.com');

      expect(result.oauth_url).toContain('https://api.instagram.com/oauth/authorize?');
    });

    it('oauth_url is null when platform has no OAuth flow (facebook)', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'facebook',
        auth_status: 'connected',
        has_tokens: false,
      } as never);
      usersRepo.getById.mockResolvedValue(null);

      const service = makeService();
      const result = await service.connect('u1', { platform: 'facebook' } as never, 'a@b.com');

      expect(result.oauth_url).toBeNull();
    });

    it('oauth_url is null when youtube OAuth is not configured', async () => {
      usersRepo.upsertFromAuth.mockResolvedValue(undefined as never);
      repo.getByPlatform.mockResolvedValue(null);
      repo.upsert.mockResolvedValue({
        platform: 'youtube',
        auth_status: 'connected',
        has_tokens: false,
      } as never);

      const service = makeService({ ...FULL_CONFIG, googleClientId: undefined });
      const result = await service.connect('u1', { platform: 'youtube' } as never, 'a@b.com');

      expect(result.oauth_url).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('returns removed: true when deleted', async () => {
      repo.delete.mockResolvedValue(true);
      const service = makeService();
      await expect(service.disconnect('u1', 'youtube')).resolves.toEqual({ removed: true });
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      repo.delete.mockResolvedValue(false);
      const service = makeService();
      await expect(service.disconnect('u1', 'youtube')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getYoutubeOAuthUrl', () => {
    it('returns a URL with the required scopes when configured', () => {
      const service = makeService();
      const { url } = service.getYoutubeOAuthUrl('u1');
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(parsed.searchParams.get('scope')).toBe(
        'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      );
      expect(parsed.searchParams.get('client_id')).toBe('google-client-id');
      expect(parsed.searchParams.get('access_type')).toBe('offline');
      expect(parsed.searchParams.get('prompt')).toBe('consent');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('state')).toBeTruthy();
    });

    it('uses the configured redirect URI when set', () => {
      const service = makeService({ ...FULL_CONFIG, googleRedirectUri: 'https://custom/redirect' });
      const { url } = service.getYoutubeOAuthUrl('u1');
      expect(new URL(url).searchParams.get('redirect_uri')).toBe('https://custom/redirect');
    });

    it('derives the redirect URI from apiPublicUrl when not explicitly configured', () => {
      const service = makeService(FULL_CONFIG);
      const { url } = service.getYoutubeOAuthUrl('u1');
      expect(new URL(url).searchParams.get('redirect_uri')).toBe(
        'https://api.example.com/api/v1/platforms/youtube/callback',
      );
    });

    it('throws BadRequestException when client id/secret missing', () => {
      const service = makeService({ ...FULL_CONFIG, googleClientId: undefined });
      expect(() => service.getYoutubeOAuthUrl('u1')).toThrow(BadRequestException);
    });
  });

  describe('getInstagramOAuthUrl', () => {
    it('returns a URL with the expected Instagram Login scopes', () => {
      const service = makeService();
      const { url } = service.getInstagramOAuthUrl('u1');
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe('https://api.instagram.com/oauth/authorize');
      expect(parsed.searchParams.get('scope')).toBe(
        'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights',
      );
      expect(parsed.searchParams.get('client_id')).toBe('meta-app-id');
    });

    it('throws BadRequestException when meta app id/secret missing', () => {
      const service = makeService({ ...FULL_CONFIG, metaAppId: undefined });
      expect(() => service.getInstagramOAuthUrl('u1')).toThrow(BadRequestException);
    });

    it('uses the configured meta redirect URI when set', () => {
      const service = makeService({ ...FULL_CONFIG, metaRedirectUri: 'https://custom/ig' });
      const { url } = service.getInstagramOAuthUrl('u1');
      expect(new URL(url).searchParams.get('redirect_uri')).toBe('https://custom/ig');
    });
  });

  describe('handleYoutubeCallback', () => {
    function makeState(service: PlatformsService, userId: string, platform = 'youtube') {
      return (service as never as { createOAuthState: (u: string, p: string) => string })[
        'createOAuthState'
      ](userId, platform);
    }

    it('exchanges the code, fetches channel metadata, saves tokens, and returns a success redirect', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'yt-access',
            refresh_token: 'yt-refresh',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [{ id: 'chan1', snippet: { title: 'My Channel' } }],
          }),
        });
      usersRepo.getById.mockResolvedValue({
        email: 'a@b.com',
        full_name: null,
        email_notifications_enabled: true,
      } as never);

      const redirect = await service.handleYoutubeCallback('auth-code', state);

      expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://oauth2.googleapis.com/token', expect.objectContaining({ method: 'POST' }));
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: 'Bearer yt-access' } },
      );
      expect(repo.saveOAuthTokens).toHaveBeenCalledWith('u1', 'youtube', {
        account_name: 'My Channel',
        account_id: 'chan1',
        access_token: 'yt-access',
        refresh_token: 'yt-refresh',
        token_expires_at: expect.any(String),
      });
      expect(redirect).toBe(
        'https://app.example.com/setup/platforms?from=oauth&platform=youtube&status=success',
      );

      // Fire-and-forget confirmation email — flush microtasks
      await Promise.resolve();
      await Promise.resolve();
      expect(email.sendPlatformConnected).toHaveBeenCalledWith('a@b.com', {
        userName: 'a',
        platformName: 'YouTube Shorts',
        accountName: 'My Channel',
      });
    });

    it('does not send a confirmation email when the profile has notifications disabled', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');

      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'yt-access' }) })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue({
        email: 'a@b.com',
        email_notifications_enabled: false,
      } as never);

      await service.handleYoutubeCallback('auth-code', state);
      await Promise.resolve();
      await Promise.resolve();

      expect(email.sendPlatformConnected).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when state is valid JSON but missing payload/sig fields', async () => {
      const service = makeService();
      const malformed = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url');
      await expect(service.handleYoutubeCallback('code', malformed)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('falls back to default channel name when channel metadata fetch fails', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'yt-access' }),
        })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      await service.handleYoutubeCallback('auth-code', state);

      expect(repo.saveOAuthTokens).toHaveBeenCalledWith(
        'u1',
        'youtube',
        expect.objectContaining({ account_name: 'YouTube Channel', account_id: null }),
      );
    });

    it('swallows channel-metadata fetch exceptions and still saves tokens', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');

      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'yt-access' }) })
        .mockRejectedValueOnce(new Error('network down'));
      usersRepo.getById.mockResolvedValue(null);

      await expect(service.handleYoutubeCallback('auth-code', state)).resolves.toBeDefined();
      expect(repo.saveOAuthTokens).toHaveBeenCalledWith(
        'u1',
        'youtube',
        expect.objectContaining({ account_name: 'YouTube Channel' }),
      );
    });

    it('throws BadRequestException when the state is invalid', async () => {
      const service = makeService();
      await expect(service.handleYoutubeCallback('code', 'not-a-valid-state')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the state was signed for a different platform', async () => {
      const service = makeService();
      const state = makeState(service, 'u1', 'instagram');
      await expect(service.handleYoutubeCallback('code', state)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the state signature does not match', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      decoded.sig = 'tampered';
      const tampered = Buffer.from(JSON.stringify(decoded)).toString('base64url');
      await expect(service.handleYoutubeCallback('code', tampered)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when Google token exchange fails', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');
      fetchMock.mockResolvedValueOnce({ ok: false, text: async () => 'invalid_grant' });
      await expect(service.handleYoutubeCallback('bad-code', state)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('falls back to localhost web URL when webAppUrl is not configured', async () => {
      const service = makeService({ ...FULL_CONFIG, webAppUrl: undefined });
      const state = makeState(service, 'u1');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'yt-access' }) })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      const redirect = await service.handleYoutubeCallback('code', state);

      expect(redirect).toBe(
        'http://localhost:3000/setup/platforms?from=oauth&platform=youtube&status=success',
      );
    });

    it('derives the google redirect URI from the localhost default when neither googleRedirectUri nor apiPublicUrl are set', async () => {
      const service = makeService({ ...FULL_CONFIG, googleRedirectUri: undefined, apiPublicUrl: undefined });
      const state = makeState(service, 'u1');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'yt-access' }) })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      await service.handleYoutubeCallback('code', state);

      const exchangeCall = fetchMock.mock.calls[0];
      const body = exchangeCall[1].body as URLSearchParams;
      expect(body.get('redirect_uri')).toBe('http://localhost:8080/api/v1/platforms/youtube/callback');
    });

    it('sends empty-string client credentials to the google token endpoint when not configured', async () => {
      const service = makeService({ ...FULL_CONFIG, googleClientId: undefined, googleClientSecret: undefined });
      const state = makeState(service, 'u1');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'yt-access' }) })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      await service.handleYoutubeCallback('code', state);

      const exchangeCall = fetchMock.mock.calls[0];
      const body = exchangeCall[1].body as URLSearchParams;
      expect(body.get('client_id')).toBe('');
      expect(body.get('client_secret')).toBe('');
    });

    it('sets token_expires_at to null when the Google token response omits expires_in', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'yt-access' }) })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      await service.handleYoutubeCallback('code', state);

      expect(repo.saveOAuthTokens).toHaveBeenCalledWith(
        'u1',
        'youtube',
        expect.objectContaining({ token_expires_at: null }),
      );
    });
  });

  describe('handleInstagramCallback', () => {
    function makeState(service: PlatformsService, userId: string, platform = 'instagram') {
      return (service as never as { createOAuthState: (u: string, p: string) => string })[
        'createOAuthState'
      ](userId, platform);
    }

    it('exchanges code, upgrades to long-lived token, fetches profile, and saves', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');

      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short-tok' }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'long-tok', expires_in: 5184000 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'ig1', username: 'creator' }),
        });
      usersRepo.getById.mockResolvedValue({
        email: 'creator@b.com',
        full_name: 'Creator Name',
        email_notifications_enabled: true,
      } as never);

      const redirect = await service.handleInstagramCallback('auth-code', state);

      expect(repo.saveOAuthTokens).toHaveBeenCalledWith('u1', 'instagram', {
        account_name: '@creator',
        account_id: 'ig1',
        access_token: 'long-tok',
        refresh_token: null,
        token_expires_at: expect.any(String),
      });
      expect(redirect).toBe(
        'https://app.example.com/setup/platforms?from=oauth&platform=instagram&status=success',
      );

      await Promise.resolve();
      await Promise.resolve();
      expect(email.sendPlatformConnected).toHaveBeenCalledWith('creator@b.com', {
        userName: 'Creator Name',
        platformName: 'Instagram Reels',
        accountName: '@creator',
      });
    });

    it('throws BadRequestException when state is valid JSON but missing payload/sig fields', async () => {
      const service = makeService();
      const malformed = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url');
      await expect(service.handleInstagramCallback('code', malformed)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('falls back to the short-lived token when long-lived exchange fails', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');

      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short-tok' }) })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      await service.handleInstagramCallback('auth-code', state);

      expect(repo.saveOAuthTokens).toHaveBeenCalledWith(
        'u1',
        'instagram',
        expect.objectContaining({
          account_name: 'Instagram Account',
          access_token: 'short-tok',
          token_expires_at: null,
        }),
      );
    });

    it('swallows profile-fetch exceptions and still saves tokens', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');

      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short-tok' }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'long-tok', expires_in: 100 }),
        })
        .mockRejectedValueOnce(new Error('network down'));
      usersRepo.getById.mockResolvedValue(null);

      await expect(service.handleInstagramCallback('auth-code', state)).resolves.toBeDefined();
      expect(repo.saveOAuthTokens).toHaveBeenCalledWith(
        'u1',
        'instagram',
        expect.objectContaining({ account_name: 'Instagram Account' }),
      );
    });

    it('throws BadRequestException when the meta code exchange fails', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');
      fetchMock.mockResolvedValueOnce({ ok: false, text: async () => 'bad code' });
      await expect(service.handleInstagramCallback('bad-code', state)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when meta does not return an access token', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await expect(service.handleInstagramCallback('code', state)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for an invalid state', async () => {
      const service = makeService();
      await expect(service.handleInstagramCallback('code', 'garbage')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('falls back to localhost web URL when webAppUrl is not configured', async () => {
      const service = makeService({ ...FULL_CONFIG, webAppUrl: undefined });
      const state = makeState(service, 'u1');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short-tok' }) })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      const redirect = await service.handleInstagramCallback('code', state);

      expect(redirect).toBe(
        'http://localhost:3000/setup/platforms?from=oauth&platform=instagram&status=success',
      );
    });

    it('derives the meta redirect URI from the localhost default when neither metaRedirectUri nor apiPublicUrl are set', async () => {
      const service = makeService({ ...FULL_CONFIG, metaRedirectUri: undefined, apiPublicUrl: undefined });
      const state = makeState(service, 'u1');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short-tok' }) })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      await service.handleInstagramCallback('code', state);

      const exchangeCall = fetchMock.mock.calls[0];
      const body = exchangeCall[1].body as URLSearchParams;
      expect(body.get('redirect_uri')).toBe('http://localhost:8080/api/v1/platforms/instagram/callback');
    });

    it('sends empty-string client credentials to the meta token endpoint when not configured', async () => {
      const service = makeService({ ...FULL_CONFIG, metaAppId: undefined, metaAppSecret: undefined });
      const state = makeState(service, 'u1');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short-tok' }) })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      await service.handleInstagramCallback('code', state);

      const exchangeCall = fetchMock.mock.calls[0];
      const body = exchangeCall[1].body as URLSearchParams;
      expect(body.get('client_id')).toBe('');
      expect(body.get('client_secret')).toBe('');
    });

    it('treats a missing expires_in on the long-lived exchange as expires_at: null and keeps the short-lived token if access_token is absent', async () => {
      const service = makeService();
      const state = makeState(service, 'u1');
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'short-tok' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: false });
      usersRepo.getById.mockResolvedValue(null);

      await service.handleInstagramCallback('code', state);

      expect(repo.saveOAuthTokens).toHaveBeenCalledWith(
        'u1',
        'instagram',
        expect.objectContaining({ access_token: 'short-tok', token_expires_at: null }),
      );
    });
  });
});
