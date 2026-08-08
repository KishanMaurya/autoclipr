import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ mocked: true })),
}));

const mockedCreateClient = createClient as jest.Mock;

describe('createServerSupabaseClient', () => {
  const originalWebSocket = (globalThis as any).WebSocket;

  afterEach(() => {
    if (originalWebSocket === undefined) {
      delete (globalThis as any).WebSocket;
    } else {
      (globalThis as any).WebSocket = originalWebSocket;
    }
  });

  it('patches globalThis.WebSocket with the ws polyfill when none exists', () => {
    delete (globalThis as any).WebSocket;
    mockedCreateClient.mockClear();

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createServerSupabaseClient } = require('./supabase-client');
      createServerSupabaseClient('https://proj.supabase.co', 'key');
    });

    expect((globalThis as any).WebSocket).toBeDefined();
  });

  it('does not overwrite an already-defined native WebSocket', () => {
    const marker = function FakeNativeWebSocket() {};
    (globalThis as any).WebSocket = marker;
    mockedCreateClient.mockClear();

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createServerSupabaseClient } = require('./supabase-client');
      createServerSupabaseClient('https://proj.supabase.co', 'key');
    });

    expect((globalThis as any).WebSocket).toBe(marker);
  });

  it('calls createClient with the url, key, and disabled session persistence/auto-refresh by default', () => {
    mockedCreateClient.mockClear();

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createServerSupabaseClient } = require('./supabase-client');
      createServerSupabaseClient('https://proj.supabase.co', 'service-key');
    });

    expect(mockedCreateClient).toHaveBeenCalledWith('https://proj.supabase.co', 'service-key', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('lets caller-supplied auth options override the defaults', () => {
    mockedCreateClient.mockClear();

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createServerSupabaseClient } = require('./supabase-client');
      createServerSupabaseClient('https://proj.supabase.co', 'service-key', {
        auth: { persistSession: true },
      });
    });

    expect(mockedCreateClient).toHaveBeenCalledWith('https://proj.supabase.co', 'service-key', {
      auth: { persistSession: true, autoRefreshToken: false },
    });
  });

  it('passes through additional client options alongside the auth defaults', () => {
    mockedCreateClient.mockClear();

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createServerSupabaseClient } = require('./supabase-client');
      createServerSupabaseClient('https://proj.supabase.co', 'service-key', {
        db: { schema: 'public' },
      } as any);
    });

    expect(mockedCreateClient).toHaveBeenCalledWith('https://proj.supabase.co', 'service-key', {
      db: { schema: 'public' },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('returns the client produced by createClient', () => {
    mockedCreateClient.mockClear();
    mockedCreateClient.mockReturnValueOnce({ marker: 'client-instance' });
    let result: unknown;

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createServerSupabaseClient } = require('./supabase-client');
      result = createServerSupabaseClient('https://proj.supabase.co', 'service-key');
    });

    expect(result).toEqual({ marker: 'client-instance' });
  });
});
