import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';

function makeService() {
  return {
    list: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    getYoutubeOAuthUrl: jest.fn(),
    getInstagramOAuthUrl: jest.fn(),
    handleYoutubeCallback: jest.fn(),
    handleInstagramCallback: jest.fn(),
  } as unknown as jest.Mocked<PlatformsService>;
}

function makeConfig(webAppUrl: string | undefined = 'https://app.example.com') {
  return { get: jest.fn(() => webAppUrl) };
}

function makeRes() {
  return { redirect: jest.fn() } as unknown as { redirect: jest.Mock };
}

describe('PlatformsController', () => {
  let service: jest.Mocked<PlatformsService>;
  let controller: PlatformsController;

  beforeEach(() => {
    service = makeService();
    controller = new PlatformsController(service, makeConfig() as never);
  });

  it('list() wraps the service result in ApiResponse.ok', async () => {
    service.list.mockResolvedValue([{ platform: 'youtube' }] as never);
    const result = await controller.list({ sub: 'u1' } as never);
    expect(service.list).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ success: true, data: [{ platform: 'youtube' }], meta: undefined });
  });

  it('connect() passes user id, dto, and email through to the service', async () => {
    service.connect.mockResolvedValue({ platform: 'youtube' } as never);
    const dto = { platform: 'youtube' } as never;
    const result = await controller.connect({ sub: 'u1', email: 'a@b.com' } as never, dto);
    expect(service.connect).toHaveBeenCalledWith('u1', dto, 'a@b.com');
    expect(result.data).toEqual({ platform: 'youtube' });
  });

  it('disconnect() delegates to the service with user id and platform param', async () => {
    service.disconnect.mockResolvedValue({ removed: true });
    const result = await controller.disconnect({ sub: 'u1' } as never, 'youtube');
    expect(service.disconnect).toHaveBeenCalledWith('u1', 'youtube');
    expect(result.data).toEqual({ removed: true });
  });

  it('youtubeOAuthUrl() delegates to the service', async () => {
    service.getYoutubeOAuthUrl.mockReturnValue({ url: 'https://accounts.google.com/x' });
    const result = await controller.youtubeOAuthUrl({ sub: 'u1' } as never);
    expect(service.getYoutubeOAuthUrl).toHaveBeenCalledWith('u1');
    expect(result.data).toEqual({ url: 'https://accounts.google.com/x' });
  });

  it('instagramOAuthUrl() delegates to the service', async () => {
    service.getInstagramOAuthUrl.mockReturnValue({ url: 'https://api.instagram.com/x' });
    const result = await controller.instagramOAuthUrl({ sub: 'u1' } as never);
    expect(service.getInstagramOAuthUrl).toHaveBeenCalledWith('u1');
    expect(result.data).toEqual({ url: 'https://api.instagram.com/x' });
  });

  describe('instagramCallback', () => {
    it('redirects to the service-provided URL on success', async () => {
      service.handleInstagramCallback.mockResolvedValue('https://app.example.com/success');
      const res = makeRes();
      await controller.instagramCallback('code', 'state', undefined, res as never);
      expect(service.handleInstagramCallback).toHaveBeenCalledWith('code', 'state');
      expect(res.redirect).toHaveBeenCalledWith('https://app.example.com/success');
    });

    it('redirects to an error URL when the provider reports an error param', async () => {
      const res = makeRes();
      await controller.instagramCallback('code', 'state', 'access_denied', res as never);
      expect(service.handleInstagramCallback).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/setup/platforms?from=oauth&platform=instagram&status=error',
      );
    });

    it('redirects to an error URL when code is missing', async () => {
      const res = makeRes();
      await controller.instagramCallback(undefined as never, 'state', undefined, res as never);
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/setup/platforms?from=oauth&platform=instagram&status=error',
      );
    });

    it('redirects to an error URL when state is missing', async () => {
      const res = makeRes();
      await controller.instagramCallback('code', undefined as never, undefined, res as never);
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/setup/platforms?from=oauth&platform=instagram&status=error',
      );
    });

    it('redirects to an error URL when the service throws', async () => {
      service.handleInstagramCallback.mockRejectedValue(new Error('bad state'));
      const res = makeRes();
      await controller.instagramCallback('code', 'state', undefined, res as never);
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/setup/platforms?from=oauth&platform=instagram&status=error',
      );
    });
  });

  describe('youtubeCallback', () => {
    it('redirects to the service-provided URL on success', async () => {
      service.handleYoutubeCallback.mockResolvedValue('https://app.example.com/success');
      const res = makeRes();
      await controller.youtubeCallback('code', 'state', undefined, res as never);
      expect(service.handleYoutubeCallback).toHaveBeenCalledWith('code', 'state');
      expect(res.redirect).toHaveBeenCalledWith('https://app.example.com/success');
    });

    it('redirects to an error URL when the provider reports an error param', async () => {
      const res = makeRes();
      await controller.youtubeCallback('code', 'state', 'access_denied', res as never);
      expect(service.handleYoutubeCallback).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/setup/platforms?from=oauth&platform=youtube&status=error',
      );
    });

    it('redirects to an error URL when code or state are missing', async () => {
      const res = makeRes();
      await controller.youtubeCallback('', '', undefined, res as never);
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/setup/platforms?from=oauth&platform=youtube&status=error',
      );
    });

    it('redirects to an error URL when the service throws', async () => {
      service.handleYoutubeCallback.mockRejectedValue(new Error('bad state'));
      const res = makeRes();
      await controller.youtubeCallback('code', 'state', undefined, res as never);
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/setup/platforms?from=oauth&platform=youtube&status=error',
      );
    });
  });

  it('falls back to localhost web URL when webAppUrl is not configured', async () => {
    const noUrlConfig = { get: jest.fn(() => undefined) };
    const localController = new PlatformsController(service, noUrlConfig as never);
    const res = makeRes();
    await localController.instagramCallback('code', 'state', 'error', res as never);
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/setup/platforms?from=oauth&platform=instagram&status=error',
    );
  });
});
