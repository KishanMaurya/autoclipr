import { ChannelsRepository } from './channels.repository';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { createSupabaseMock, ChainableMock } from '../../test-utils/supabase-mock';

describe('ChannelsRepository', () => {
  let repo: ChannelsRepository;
  let chain: ChainableMock;
  let supabase: { getClient: jest.Mock };

  beforeEach(() => {
    chain = createSupabaseMock();
    supabase = { getClient: jest.fn().mockReturnValue(chain) };
    repo = new ChannelsRepository(supabase as unknown as SupabaseAdminService);
  });

  describe('listByUser', () => {
    it('returns channels on success', async () => {
      chain.__setResult({ data: [{ id: 'ch1' }], error: null });
      const result = await repo.listByUser('u1');
      expect(chain.from).toHaveBeenCalledWith('youtube_channels');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(result).toEqual([{ id: 'ch1' }]);
    });

    it('defaults to [] when data is null', async () => {
      chain.__setResult({ data: null, error: null });
      const result = await repo.listByUser('u1');
      expect(result).toEqual([]);
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.listByUser('u1')).rejects.toThrow('boom');
    });
  });

  describe('create', () => {
    it('returns the created channel on success', async () => {
      const row = { id: 'ch1', channel_name: 'Test' };
      chain.__setResult({ data: row, error: null });
      const result = await repo.create({
        user_id: 'u1',
        channel_url: 'https://www.youtube.com/@test',
        channel_name: 'Test',
      });
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          channel_url: 'https://www.youtube.com/@test',
          channel_name: 'Test',
          thumbnail_url: null,
          is_trial_channel: true,
        }),
      );
      expect(result).toBe(row);
    });

    it('respects an explicit is_trial_channel value', async () => {
      chain.__setResult({ data: { id: 'ch1' }, error: null });
      await repo.create({
        user_id: 'u1',
        channel_url: 'url',
        channel_name: 'Test',
        is_trial_channel: false,
      });
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_trial_channel: false }),
      );
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(
        repo.create({ user_id: 'u1', channel_url: 'url', channel_name: 'Test' }),
      ).rejects.toThrow('boom');
    });

    it('throws when no row is returned', async () => {
      chain.__setResult({ data: null, error: null });
      await expect(
        repo.create({ user_id: 'u1', channel_url: 'url', channel_name: 'Test' }),
      ).rejects.toThrow('Failed to connect channel');
    });
  });

  describe('delete', () => {
    it('returns true when rows were deleted', async () => {
      chain.__setResult({ data: [{ id: 'ch1' }], error: null });
      const result = await repo.delete('ch1', 'u1');
      expect(chain.eq).toHaveBeenCalledWith('id', 'ch1');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(result).toBe(true);
    });

    it('returns false when no rows were deleted', async () => {
      chain.__setResult({ data: [], error: null });
      const result = await repo.delete('ch1', 'u1');
      expect(result).toBe(false);
    });

    it('returns false when data is null', async () => {
      chain.__setResult({ data: null, error: null });
      const result = await repo.delete('ch1', 'u1');
      expect(result).toBe(false);
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.delete('ch1', 'u1')).rejects.toThrow('boom');
    });
  });
});
