import { ClipsRepository } from './clips.repository';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { createSupabaseMock, ChainableMock } from '../../test-utils/supabase-mock';

describe('ClipsRepository', () => {
  let repo: ClipsRepository;
  let chain: ChainableMock;
  let supabase: { getClient: jest.Mock };

  beforeEach(() => {
    chain = createSupabaseMock();
    supabase = { getClient: jest.fn().mockReturnValue(chain) };
    repo = new ClipsRepository(supabase as unknown as SupabaseAdminService);
  });

  describe('listByUser', () => {
    it('returns items and total on success', async () => {
      chain.__setResult({ data: [{ id: 'c1' }], error: null, count: 1 });
      const result = await repo.listByUser('u1', 20, 0);
      expect(chain.from).toHaveBeenCalledWith('clips');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(chain.range).toHaveBeenCalledWith(0, 19);
      expect(result).toEqual({ items: [{ id: 'c1' }], total: 1 });
    });

    it('defaults to empty items/total 0 when data/count are null', async () => {
      chain.__setResult({ data: null, error: null, count: null });
      const result = await repo.listByUser('u1', 20, 0);
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.listByUser('u1', 20, 0)).rejects.toThrow('boom');
    });
  });

  describe('getById', () => {
    it('returns the clip when found', async () => {
      const clip = { id: 'c1' };
      chain.__setResult({ data: clip, error: null });
      const result = await repo.getById('c1', 'u1');
      expect(result).toBe(clip);
    });

    it('returns null when not found', async () => {
      chain.__setResult({ data: null, error: null });
      const result = await repo.getById('c1', 'u1');
      expect(result).toBeNull();
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.getById('c1', 'u1')).rejects.toThrow('boom');
    });
  });

  describe('listByVideoId', () => {
    it('returns clips for the given video', async () => {
      chain.__setResult({ data: [{ id: 'c1' }, { id: 'c2' }], error: null });
      const result = await repo.listByVideoId('v1', 'u1');
      expect(chain.eq).toHaveBeenCalledWith('video_id', 'v1');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(result).toEqual([{ id: 'c1' }, { id: 'c2' }]);
    });

    it('defaults to an empty array when data is null', async () => {
      chain.__setResult({ data: null, error: null });
      const result = await repo.listByVideoId('v1', 'u1');
      expect(result).toEqual([]);
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.listByVideoId('v1', 'u1')).rejects.toThrow('boom');
    });
  });

  describe('deleteById', () => {
    it('returns true when a row was deleted', async () => {
      chain.__setResult({ data: { id: 'c1' }, error: null });
      const result = await repo.deleteById('c1', 'u1');
      expect(result).toBe(true);
    });

    it('returns false when no row matched', async () => {
      chain.__setResult({ data: null, error: null });
      const result = await repo.deleteById('c1', 'u1');
      expect(result).toBe(false);
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.deleteById('c1', 'u1')).rejects.toThrow('boom');
    });
  });
});
