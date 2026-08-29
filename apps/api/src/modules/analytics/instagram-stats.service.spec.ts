import { InstagramStatsService } from './instagram-stats.service';

describe('InstagramStatsService', () => {
  let service: InstagramStatsService;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new InstagramStatsService();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns an empty array immediately for an empty mediaIds list without calling fetch', async () => {
    const result = await service.fetchMediaStats('token', []);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('combines media fields and insights views for a successful response', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ like_count: 10, comments_count: 3 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ name: 'views', values: [{ value: 250 }] }] }),
      });

    const result = await service.fetchMediaStats('token', ['media1']);

    // The second argument is supplied by fetchWithTimeout — asserting the
    // signal is there is what proves the call is actually time-bounded.
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://graph.instagram.com/v21.0/media1?fields=like_count,comments_count&access_token=token',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://graph.instagram.com/v21.0/media1/insights?metric=views&access_token=token',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toEqual([{ mediaId: 'media1', viewCount: 250, likeCount: 10, commentCount: 3 }]);
  });

  it('fetches stats for multiple media ids in parallel', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('media1') && !url.includes('insights')) {
        return Promise.resolve({ ok: true, json: async () => ({ like_count: 1, comments_count: 1 }) });
      }
      if (url.includes('media1')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [{ values: [{ value: 100 }] }] }) });
      }
      if (url.includes('media2') && !url.includes('insights')) {
        return Promise.resolve({ ok: true, json: async () => ({ like_count: 2, comments_count: 2 }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [{ values: [{ value: 200 }] }] }) });
    });

    const result = await service.fetchMediaStats('token', ['media1', 'media2']);

    expect(result).toEqual([
      { mediaId: 'media1', viewCount: 100, likeCount: 1, commentCount: 1 },
      { mediaId: 'media2', viewCount: 200, likeCount: 2, commentCount: 2 },
    ]);
  });

  it('defaults like/comment counts to 0 when the media call fails', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ values: [{ value: 5 }] }] }),
      });

    const result = await service.fetchMediaStats('token', ['media1']);

    expect(result).toEqual([{ mediaId: 'media1', viewCount: 5, likeCount: 0, commentCount: 0 }]);
  });

  it('defaults view count to 0 and logs a warning when the insights call fails', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ like_count: 4, comments_count: 1 }) })
      .mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'insufficient scope' });

    const result = await service.fetchMediaStats('token', ['media1']);

    expect(result).toEqual([{ mediaId: 'media1', viewCount: 0, likeCount: 4, commentCount: 1 }]);
    expect(service['logger'].warn).toHaveBeenCalledWith(
      expect.stringContaining('Instagram insights call failed for media media1 (status 403)'),
    );
  });

  it('handles a malformed insights response shape gracefully (missing data array)', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ like_count: 1, comments_count: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const result = await service.fetchMediaStats('token', ['media1']);

    expect(result).toEqual([{ mediaId: 'media1', viewCount: 0, likeCount: 1, commentCount: 1 }]);
  });

  it('filters out a media item when fetch throws, keeping other results', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('bad-media')) {
        return Promise.reject(new Error('network error'));
      }
      if (!url.includes('insights')) {
        return Promise.resolve({ ok: true, json: async () => ({ like_count: 9, comments_count: 2 }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [{ values: [{ value: 42 }] }] }) });
    });

    const result = await service.fetchMediaStats('token', ['bad-media', 'good-media']);

    expect(result).toEqual([{ mediaId: 'good-media', viewCount: 42, likeCount: 9, commentCount: 2 }]);
    expect(service['logger'].warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch Instagram stats for media bad-media'),
    );
  });

  it('returns an empty array when every media id fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await service.fetchMediaStats('token', ['media1', 'media2']);
    expect(result).toEqual([]);
  });
});
