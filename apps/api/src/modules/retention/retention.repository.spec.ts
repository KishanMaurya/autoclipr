import { Test } from '@nestjs/testing';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { RetentionRepository } from './retention.repository';
import {
  createMockSupabaseClient,
  mockQueryBuilder,
  mockSupabaseAdminService,
} from '../../test-utils/supabase-mock';

describe('RetentionRepository', () => {
  let repo: RetentionRepository;
  let client: ReturnType<typeof createMockSupabaseClient>;

  const row = {
    id: 'v1',
    user_id: 'u1',
    title: 'My video',
    created_at: '2026-08-01T00:00:00.000Z',
    retention_warning_sent_at: null,
    profiles: { email: 'jane@example.com', full_name: 'Jane Doe', subscription_tier: 'starter' },
  };

  beforeEach(async () => {
    client = createMockSupabaseClient();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RetentionRepository,
        { provide: SupabaseAdminService, useValue: mockSupabaseAdminService(client) },
      ],
    }).compile();

    repo = moduleRef.get(RetentionRepository);
  });

  describe('findVideosToWarn', () => {
    it('filters to un-warned videos older than the cutoff, owned by free-tier users', async () => {
      const builder = mockQueryBuilder({ data: [row], error: null });
      client.from.mockReturnValue(builder);
      const cutoff = new Date('2026-08-10T00:00:00.000Z');

      const result = await repo.findVideosToWarn(cutoff, 50);

      expect(client.from).toHaveBeenCalledWith('videos');
      expect(builder.is).toHaveBeenCalledWith('retention_warning_sent_at', null);
      expect(builder.lt).toHaveBeenCalledWith('created_at', cutoff.toISOString());
      expect(builder.in).toHaveBeenCalledWith('profiles.subscription_tier', ['starter', 'free']);
      expect(builder.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual([
        {
          id: 'v1',
          user_id: 'u1',
          title: 'My video',
          created_at: '2026-08-01T00:00:00.000Z',
          retention_warning_sent_at: null,
          email: 'jane@example.com',
          full_name: 'Jane Doe',
        },
      ]);
    });

    it('returns an empty list when Supabase returns no rows', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: null }));

      await expect(repo.findVideosToWarn(new Date(), 10)).resolves.toEqual([]);
    });

    it('throws when Supabase errors', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'boom' } }));

      await expect(repo.findVideosToWarn(new Date(), 10)).rejects.toThrow('boom');
    });

    it('unwraps a joined profile returned as an array', async () => {
      client.from.mockReturnValue(
        mockQueryBuilder({
          data: [{ ...row, profiles: [{ email: 'a@b.com', full_name: null }] }],
          error: null,
        }),
      );

      const [result] = await repo.findVideosToWarn(new Date(), 10);

      expect(result.email).toBe('a@b.com');
      expect(result.full_name).toBeNull();
    });

    it('falls back to empty contact details when the join is missing', async () => {
      client.from.mockReturnValue(
        mockQueryBuilder({ data: [{ ...row, profiles: undefined }], error: null }),
      );

      const [result] = await repo.findVideosToWarn(new Date(), 10);

      expect(result.email).toBe('');
      expect(result.full_name).toBeNull();
    });
  });

  describe('findVideosToDelete', () => {
    it('filters to warned videos past the grace cutoff, still on a free tier', async () => {
      const builder = mockQueryBuilder({ data: [row], error: null });
      client.from.mockReturnValue(builder);
      const cutoff = new Date('2026-08-10T00:00:00.000Z');

      await repo.findVideosToDelete(cutoff, 25);

      expect(builder.not).toHaveBeenCalledWith('retention_warning_sent_at', 'is', null);
      expect(builder.lt).toHaveBeenCalledWith('retention_warning_sent_at', cutoff.toISOString());
      // Re-checking the tier here is what protects a user who upgraded after
      // being warned.
      expect(builder.in).toHaveBeenCalledWith('profiles.subscription_tier', ['starter', 'free']);
      expect(builder.limit).toHaveBeenCalledWith(25);
    });

    it('throws when Supabase errors', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'nope' } }));

      await expect(repo.findVideosToDelete(new Date(), 10)).rejects.toThrow('nope');
    });

    it('returns an empty list when there is nothing to delete', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: [], error: null }));

      await expect(repo.findVideosToDelete(new Date(), 10)).resolves.toEqual([]);
    });
  });

  describe('markWarned', () => {
    it('stamps every id with the given timestamp', async () => {
      const builder = mockQueryBuilder({ data: null, error: null });
      client.from.mockReturnValue(builder);
      const at = new Date('2026-08-31T09:00:00.000Z');

      await repo.markWarned(['v1', 'v2'], at);

      expect(builder.update).toHaveBeenCalledWith({
        retention_warning_sent_at: at.toISOString(),
      });
      expect(builder.in).toHaveBeenCalledWith('id', ['v1', 'v2']);
    });

    it('does not touch the database for an empty id list', async () => {
      await repo.markWarned([], new Date());

      expect(client.from).not.toHaveBeenCalled();
    });

    it('throws when the update fails', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'locked' } }));

      await expect(repo.markWarned(['v1'], new Date())).rejects.toThrow('locked');
    });
  });

  describe('clearWarningsForUser', () => {
    it('nulls the stamp for that user only', async () => {
      const builder = mockQueryBuilder({ data: null, error: null });
      client.from.mockReturnValue(builder);

      await repo.clearWarningsForUser('u1');

      expect(builder.update).toHaveBeenCalledWith({ retention_warning_sent_at: null });
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(builder.not).toHaveBeenCalledWith('retention_warning_sent_at', 'is', null);
    });

    it('throws when the update fails', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'denied' } }));

      await expect(repo.clearWarningsForUser('u1')).rejects.toThrow('denied');
    });
  });
});
