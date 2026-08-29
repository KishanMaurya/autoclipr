import { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout } from './fetch-with-timeout.util';

describe('fetchWithTimeout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('resolves with the response when the request completes in time', async () => {
    const response = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(response);

    await expect(fetchWithTimeout('https://example.com')).resolves.toBe(response);
  });

  it('passes the url and init through to fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({} as Response);

    await fetchWithTimeout('https://example.com', {
      method: 'POST',
      headers: { 'X-Test': '1' },
    });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://example.com');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'X-Test': '1' });
  });

  it('does not forward timeoutMs to fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({} as Response);

    await fetchWithTimeout('https://example.com', { timeoutMs: 500 });

    expect((global.fetch as jest.Mock).mock.calls[0][1]).not.toHaveProperty('timeoutMs');
  });

  it('always supplies an AbortSignal', async () => {
    global.fetch = jest.fn().mockResolvedValue({} as Response);

    await fetchWithTimeout('https://example.com');

    expect((global.fetch as jest.Mock).mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts and reports a timeout when the upstream hangs', async () => {
    // Never settles until aborted — the hung-upstream case.
    global.fetch = jest.fn(
      (_url, init: RequestInit = {}) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('This operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }) as Promise<Response>,
    ) as unknown as typeof fetch;

    await expect(
      fetchWithTimeout('https://example.com', { timeoutMs: 10 }),
    ).rejects.toThrow('Request timed out after 10ms');
  });

  it('clears the timer once the request settles', async () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    global.fetch = jest.fn().mockResolvedValue({} as Response);

    await fetchWithTimeout('https://example.com');

    expect(clearSpy).toHaveBeenCalled();
  });

  it('clears the timer when the request rejects', async () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(fetchWithTimeout('https://example.com')).rejects.toThrow('network down');
    expect(clearSpy).toHaveBeenCalled();
  });

  it('propagates a non-abort network error unchanged', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(fetchWithTimeout('https://example.com')).rejects.toThrow('ECONNREFUSED');
  });

  it('honours a caller-supplied signal and keeps its abort error', async () => {
    const controller = new AbortController();
    global.fetch = jest.fn(
      (_url, init: RequestInit = {}) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('This operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }) as Promise<Response>,
    ) as unknown as typeof fetch;

    const promise = fetchWithTimeout('https://example.com', { signal: controller.signal });
    controller.abort();

    // Caller-initiated aborts keep the original error rather than being
    // relabelled as our timeout.
    await expect(promise).rejects.toThrow('This operation was aborted');
  });

  it('exposes a sane default timeout', () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(10_000);
  });
});
