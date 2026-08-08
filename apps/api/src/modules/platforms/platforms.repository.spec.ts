import { PlatformsRepository } from './platforms.repository';
import {
  createQueryBuilderMock,
  createSupabaseClientMock,
  createSupabaseAdminServiceMock,
  type QueryBuilderMock,
} from '../../test-utils/supabase-query-builder.mock';

describe('PlatformsRepository', () => {
  let repo: PlatformsRepository;
  let builder: QueryBuilderMock;
  let fromMock: jest.Mock;

  function setup(result: Parameters<typeof createQueryBuilderMock>[0]) {
    builder = createQueryBuilderMock(result);
    const client = createSupabaseClientMock(() => builder);
    fromMock = client.from;
    const supabase = createSupabaseAdminServiceMock(client);
    repo = new PlatformsRepository(supabase as never);
  }

  /**
   * upsert() and saveOAuthTokens() both call getByPlatform() internally
   * before issuing their own `.upsert()` call — i.e. two separate `.from()`
   * invocations. This wires distinct results per call so the two can be
   * asserted independently (e.g. getByPlatform succeeds but the upsert call
   * itself errors).
   */
  function setupSequential(results: Array<Parameters<typeof createQueryBuilderMock>[0]>) {
    const builders = results.map((r) => createQueryBuilderMock(r));
    const client = { from: jest.fn() };
    for (const b of builders) {
      client.from.mockReturnValueOnce(b);
    }
    fromMock = client.from;
    const supabase = createSupabaseAdminServiceMock(client);
    repo = new PlatformsRepository(supabase as never);
    return builders;
  }

  describe('listByUser', () => {
    it('maps rows and derives has_tokens from access_token presence', async () => {
      setup({
        data: [
          {
            id: '1',
            user_id: 'u1',
            platform: 'youtube',
            account_name: 'Chan',
            account_id: 'c1',
            access_token: 'tok',
            token_expires_at: null,
            auth_status: 'authorized',
            metadata: {},
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
          {
            id: '2',
            user_id: 'u1',
            platform: 'instagram',
            account_name: null,
            account_id: null,
            access_token: null,
            token_expires_at: null,
            auth_status: 'connected',
            metadata: {},
            created_at: '2024-01-02',
            updated_at: '2024-01-02',
          },
        ],
        error: null,
      });

      const result = await repo.listByUser('u1');

      expect(fromMock).toHaveBeenCalledWith('platform_connections');
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual([
        {
          id: '1',
          user_id: 'u1',
          platform: 'youtube',
          account_name: 'Chan',
          account_id: 'c1',
          token_expires_at: null,
          auth_status: 'authorized',
          metadata: {},
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          has_tokens: true,
        },
        {
          id: '2',
          user_id: 'u1',
          platform: 'instagram',
          account_name: null,
          account_id: null,
          token_expires_at: null,
          auth_status: 'connected',
          metadata: {},
          created_at: '2024-01-02',
          updated_at: '2024-01-02',
          has_tokens: false,
        },
      ]);
      expect((result[0] as Record<string, unknown>).access_token).toBeUndefined();
    });

    it('returns empty array when data is null', async () => {
      setup({ data: null, error: null });
      const result = await repo.listByUser('u1');
      expect(result).toEqual([]);
    });

    it('throws when supabase returns an error', async () => {
      setup({ data: null, error: { message: 'boom' } });
      await expect(repo.listByUser('u1')).rejects.toThrow('boom');
    });
  });

  describe('getByPlatform', () => {
    it('returns the row when found', async () => {
      setup({ data: { id: '1', platform: 'youtube' }, error: null });
      const result = await repo.getByPlatform('u1', 'youtube');
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(builder.eq).toHaveBeenCalledWith('platform', 'youtube');
      expect(result).toEqual({ id: '1', platform: 'youtube' });
    });

    it('returns null when no row found', async () => {
      setup({ data: null, error: null });
      const result = await repo.getByPlatform('u1', 'youtube');
      expect(result).toBeNull();
    });

    it('throws on error', async () => {
      setup({ data: null, error: { message: 'db down' } });
      await expect(repo.getByPlatform('u1', 'youtube')).rejects.toThrow('db down');
    });
  });

  describe('upsert', () => {
    it('upserts using provided values and falls back to existing on undefined fields', async () => {
      // getByPlatform() is called internally first — same builder mock is reused for
      // both calls since our mock always returns the configured result.
      setup({
        data: {
          id: '1',
          user_id: 'u1',
          platform: 'youtube',
          account_name: 'Existing',
          access_token: 'existing-token',
          refresh_token: 'existing-refresh',
          token_expires_at: 'existing-exp',
          auth_status: 'authorized',
          metadata: { foo: 'bar' },
          created_at: 'c',
          updated_at: 'u',
        },
        error: null,
      });

      const result = await repo.upsert({
        user_id: 'u1',
        platform: 'youtube',
      });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          platform: 'youtube',
          account_name: 'Existing',
          access_token: 'existing-token',
          refresh_token: 'existing-refresh',
          token_expires_at: 'existing-exp',
          auth_status: 'authorized',
          metadata: { foo: 'bar' },
        }),
        { onConflict: 'user_id,platform' },
      );
      expect(result.has_tokens).toBe(true);
      expect((result as Record<string, unknown>).access_token).toBeUndefined();
    });

    it('overrides explicit null access_token instead of falling back to existing', async () => {
      setup({
        data: {
          id: '1',
          user_id: 'u1',
          platform: 'youtube',
          access_token: null,
          metadata: {},
        },
        error: null,
      });

      await repo.upsert({ user_id: 'u1', platform: 'youtube', access_token: null });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ access_token: null }),
        { onConflict: 'user_id,platform' },
      );
    });

    it('defaults auth_status to connected and metadata to {} when nothing existing and none provided', async () => {
      setup({
        data: { id: '1', user_id: 'u1', platform: 'youtube', metadata: {} },
        error: null,
      });

      await repo.upsert({ user_id: 'u1', platform: 'youtube' });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ auth_status: 'connected', metadata: {} }),
        { onConflict: 'user_id,platform' },
      );
    });

    it('throws when the upsert call itself returns an error (distinct from the getByPlatform lookup)', async () => {
      // First .from() call is the internal getByPlatform() lookup (succeeds, no existing row);
      // second is the upsert()'s own call, which errors.
      setupSequential([
        { data: null, error: null },
        { data: null, error: { message: 'upsert failed' } },
      ]);
      await expect(repo.upsert({ user_id: 'u1', platform: 'youtube' })).rejects.toThrow(
        'upsert failed',
      );
    });

    it('propagates an error thrown by the internal getByPlatform lookup', async () => {
      setup({ data: null, error: { message: 'lookup failed' } });
      await expect(repo.upsert({ user_id: 'u1', platform: 'youtube' })).rejects.toThrow(
        'lookup failed',
      );
    });

    it('throws when upsert returns no row and no error', async () => {
      setup({ data: null, error: null });
      await expect(repo.upsert({ user_id: 'u1', platform: 'youtube' })).rejects.toThrow(
        'Failed to save platform connection',
      );
    });

    it('uses explicitly provided refresh_token and token_expires_at even when falsy-but-defined', async () => {
      const [, upsertBuilder] = setupSequential([
        { data: null, error: null },
        { data: { id: '1', metadata: {} }, error: null },
      ]);

      await repo.upsert({
        user_id: 'u1',
        platform: 'youtube',
        refresh_token: null,
        token_expires_at: null,
      });

      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ refresh_token: null, token_expires_at: null }),
        { onConflict: 'user_id,platform' },
      );
    });

    it('uses explicitly provided non-null refresh_token and token_expires_at over existing values', async () => {
      const [, upsertBuilder] = setupSequential([
        { data: { refresh_token: 'stale-refresh', token_expires_at: 'stale-exp' }, error: null },
        { data: { id: '1', metadata: {} }, error: null },
      ]);

      await repo.upsert({
        user_id: 'u1',
        platform: 'youtube',
        refresh_token: 'fresh-refresh',
        token_expires_at: 'fresh-exp',
      });

      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ refresh_token: 'fresh-refresh', token_expires_at: 'fresh-exp' }),
        { onConflict: 'user_id,platform' },
      );
    });
  });

  describe('saveOAuthTokens', () => {
    it('upserts with authorized status and provided tokens', async () => {
      setup({ data: { id: '1' }, error: null });

      await repo.saveOAuthTokens('u1', 'youtube', {
        access_token: 'at',
        refresh_token: 'rt',
        token_expires_at: 'exp',
        account_name: 'My Channel',
        account_id: 'acc1',
      });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          platform: 'youtube',
          account_name: 'My Channel',
          account_id: 'acc1',
          access_token: 'at',
          refresh_token: 'rt',
          token_expires_at: 'exp',
          auth_status: 'authorized',
        }),
        { onConflict: 'user_id,platform' },
      );
    });

    it('falls back to default account name and existing refresh token when omitted', async () => {
      setup({
        data: {
          id: '1',
          account_name: 'Existing Name',
          refresh_token: 'existing-refresh',
          metadata: { a: 1 },
        },
        error: null,
      });

      await repo.saveOAuthTokens('u1', 'youtube', { access_token: 'at' });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          account_name: 'Existing Name',
          refresh_token: 'existing-refresh',
          token_expires_at: null,
          metadata: { a: 1 },
        }),
        { onConflict: 'user_id,platform' },
      );
    });

    it('defaults account_name to "YouTube Shorts" and refresh_token to null when nothing exists and none is provided', async () => {
      const [, upsertBuilder] = setupSequential([
        { data: null, error: null },
        { data: null, error: null },
      ]);

      await repo.saveOAuthTokens('u1', 'youtube', { access_token: 'at' });

      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          account_name: 'YouTube Shorts',
          account_id: null,
          refresh_token: null,
          metadata: {},
        }),
        { onConflict: 'user_id,platform' },
      );
    });

    it('throws when the upsert call itself returns an error (distinct from the getByPlatform lookup)', async () => {
      setupSequential([
        { data: null, error: null },
        { data: null, error: { message: 'save failed' } },
      ]);
      await expect(
        repo.saveOAuthTokens('u1', 'youtube', { access_token: 'at' }),
      ).rejects.toThrow('save failed');
    });

    it('propagates an error thrown by the internal getByPlatform lookup', async () => {
      setup({ data: null, error: { message: 'lookup failed' } });
      await expect(
        repo.saveOAuthTokens('u1', 'youtube', { access_token: 'at' }),
      ).rejects.toThrow('lookup failed');
    });
  });

  describe('delete', () => {
    it('returns true when a row was removed', async () => {
      setup({ data: [{ id: '1' }], error: null });
      const result = await repo.delete('u1', 'youtube');
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(builder.eq).toHaveBeenCalledWith('platform', 'youtube');
      expect(result).toBe(true);
    });

    it('returns false when no row was removed', async () => {
      setup({ data: [], error: null });
      const result = await repo.delete('u1', 'youtube');
      expect(result).toBe(false);
    });

    it('returns false when data is null', async () => {
      setup({ data: null, error: null });
      const result = await repo.delete('u1', 'youtube');
      expect(result).toBe(false);
    });

    it('throws on error', async () => {
      setup({ data: null, error: { message: 'delete failed' } });
      await expect(repo.delete('u1', 'youtube')).rejects.toThrow('delete failed');
    });
  });
});
