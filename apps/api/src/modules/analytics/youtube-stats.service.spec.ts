import { YoutubeStatsService } from './youtube-stats.service';

function makeConfig(map: Record<string, string | undefined> = {}) {
  return { get: jest.fn((key: string) => map[key]) };
}

describe('YoutubeStatsService', () => {
  let service: YoutubeStatsService;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new YoutubeStatsService(
      makeConfig({ googleClientId: 'gcid', googleClientSecret: 'gcsecret' }) as never,
    );
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns an empty array immediately for an empty videoIds list without calling fetch', async () => {
    const result = await service.fetchVideoStats('token', []);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps statistics for a successful response, coercing string counts to numbers', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: 'v1', statistics: { viewCount: '100', likeCount: '10', commentCount: '2' } },
        ],
      }),
    });

    const result = await service.fetchVideoStats('token', ['v1']);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/youtube/v3/videos?part=statistics&id=v1',
      { headers: { Authorization: 'Bearer token' } },
    );
    expect(result).toEqual([{ videoId: 'v1', viewCount: 100, likeCount: 10, commentCount: 2 }]);
  });

  it('defaults missing statistics fields to 0', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: 'v1', statistics: {} }] }),
    });

    const result = await service.fetchVideoStats('token', ['v1']);

    expect(result).toEqual([{ videoId: 'v1', viewCount: 0, likeCount: 0, commentCount: 0 }]);
  });

  it('returns an empty array when items is missing from the response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const result = await service.fetchVideoStats('token', ['v1']);
    expect(result).toEqual([]);
  });

  it('caps requested video ids at 50 per request', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
    const ids = Array.from({ length: 60 }, (_, i) => `v${i}`);
    await service.fetchVideoStats('token', ids);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const idsParam = new URL(calledUrl).searchParams.get('id')!;
    expect(idsParam.split(',')).toHaveLength(50);
  });

  it('throws when the API responds with a non-ok, non-401 status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'quota exceeded',
    });

    await expect(service.fetchVideoStats('token', ['v1'])).rejects.toThrow(
      'YouTube stats failed (403): quota exceeded',
    );
  });

  it('refreshes the access token on a 401 and retries once', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 'v1', statistics: { viewCount: '5' } }] }),
      });

    const onTokenRefresh = jest.fn().mockResolvedValue(undefined);
    const result = await service.fetchVideoStats('expired-token', ['v1'], 'refresh-token', onTokenRefresh);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('videos?part=statistics&id=v1'),
      { headers: { Authorization: 'Bearer expired-token' } },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://oauth2.googleapis.com/token', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('videos?part=statistics&id=v1'),
      { headers: { Authorization: 'Bearer new-access' } },
    );
    expect(onTokenRefresh).toHaveBeenCalledWith({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_at: expect.any(String),
    });
    expect(result).toEqual([{ videoId: 'v1', viewCount: 5, likeCount: 0, commentCount: 0 }]);
  });

  it('does not attempt a refresh on 401 when no refreshToken/onTokenRefresh is provided', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'unauthorized' });

    await expect(service.fetchVideoStats('token', ['v1'])).rejects.toThrow(
      'YouTube stats failed (401): unauthorized',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the token refresh call fails', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 400 });

    await expect(
      service.fetchVideoStats('token', ['v1'], 'refresh-token', jest.fn()),
    ).rejects.toThrow('YouTube token refresh failed');
  });

  it('preserves the original refresh token when the refresh response omits one', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-access', expires_in: 100 }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });

    const onTokenRefresh = jest.fn().mockResolvedValue(undefined);
    await service.fetchVideoStats('token', ['v1'], 'original-refresh', onTokenRefresh);

    expect(onTokenRefresh).toHaveBeenCalledWith(
      expect.objectContaining({ refresh_token: 'original-refresh' }),
    );
  });

  it('sets expires_at to null when the refresh response omits expires_in', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'new-access' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });

    const onTokenRefresh = jest.fn().mockResolvedValue(undefined);
    await service.fetchVideoStats('token', ['v1'], 'refresh', onTokenRefresh);

    expect(onTokenRefresh).toHaveBeenCalledWith(expect.objectContaining({ expires_at: null }));
  });

  it('defaults videoId to an empty string when an item has no id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ statistics: { viewCount: '1' } }] }),
    });

    const result = await service.fetchVideoStats('token', ['v1']);

    expect(result).toEqual([{ videoId: '', viewCount: 1, likeCount: 0, commentCount: 0 }]);
  });

  it('sends empty-string client credentials to the refresh endpoint when not configured', async () => {
    const unconfiguredService = new YoutubeStatsService(makeConfig({}) as never);
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'new-access', expires_in: 10 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });

    await unconfiguredService.fetchVideoStats('token', ['v1'], 'refresh', jest.fn().mockResolvedValue(undefined));

    const refreshCall = fetchMock.mock.calls[1];
    const body = refreshCall[1].body as URLSearchParams;
    expect(body.get('client_id')).toBe('');
    expect(body.get('client_secret')).toBe('');
  });
});
