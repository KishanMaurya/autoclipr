/** Default ceiling for a single outbound call to a third-party API. */
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/**
 * fetch() with a hard timeout.
 *
 * Node's fetch has no default timeout, so a hung upstream (YouTube, Instagram,
 * Google OAuth) holds the request open indefinitely — the caller waits, a
 * worker slot stays occupied, and the client eventually sees a gateway timeout
 * with no useful error. Aborting ourselves turns that into a fast, explicit
 * failure the caller can handle.
 *
 * Any caller-supplied `signal` is still honoured: whichever aborts first wins.
 */
export async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...rest } = init;

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    // Distinguish our own timeout from an unrelated network error so callers
    // and logs aren't left with a bare "This operation was aborted".
    if (!signal?.aborted && err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
