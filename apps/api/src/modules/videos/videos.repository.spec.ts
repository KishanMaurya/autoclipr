import { VideosRepository } from './videos.repository';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { createSupabaseMock, ChainableMock } from '../../test-utils/supabase-mock';

describe('VideosRepository', () => {
  let repo: VideosRepository;
  let chain: ChainableMock;
  let supabase: { getClient: jest.Mock };

  beforeEach(() => {
    chain = createSupabaseMock();
    supabase = { getClient: jest.fn().mockReturnValue(chain) };
    repo = new VideosRepository(supabase as unknown as SupabaseAdminService);
  });

  describe('create', () => {
    it('returns the created video on success', async () => {
      const video = { id: 'v1', title: 'My video' };
      chain.__setResult({ data: video, error: null });

      const result = await repo.create({
        user_id: 'u1',
        title: 'My video',
        storage_path: 'path',
        status: 'uploading',
      });

      expect(chain.from).toHaveBeenCalledWith('videos');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'My video',
          storage_path: 'path',
          status: 'uploading',
          mime_type: null,
          file_size_bytes: null,
          source_url: null,
          source_type: 'upload',
        }),
      );
      expect(result).toBe(video);
    });

    it('defaults source_type when not given but keeps a provided source_type', async () => {
      chain.__setResult({ data: { id: 'v1' }, error: null });
      await repo.create({
        user_id: 'u1',
        title: 't',
        storage_path: 'p',
        status: 'importing',
        source_type: 'youtube',
      });
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ source_type: 'youtube' }),
      );
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'db down' } });
      await expect(
        repo.create({ user_id: 'u1', title: 't', storage_path: 'p', status: 's' }),
      ).rejects.toThrow('db down');
    });

    it('throws when no data is returned', async () => {
      chain.__setResult({ data: null, error: null });
      await expect(
        repo.create({ user_id: 'u1', title: 't', storage_path: 'p', status: 's' }),
      ).rejects.toThrow('Failed to create video');
    });
  });

  describe('listByUser', () => {
    it('returns items and total on success', async () => {
      chain.__setResult({ data: [{ id: 'v1' }, { id: 'v2' }], error: null, count: 2 });
      const result = await repo.listByUser('u1', 20, 0);
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(chain.range).toHaveBeenCalledWith(0, 19);
      expect(result).toEqual({ items: [{ id: 'v1' }, { id: 'v2' }], total: 2 });
    });

    it('defaults items to [] and total to 0 when data/count are null', async () => {
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
    it('returns the video when found', async () => {
      const video = { id: 'v1' };
      chain.__setResult({ data: video, error: null });
      const result = await repo.getById('v1', 'u1');
      expect(chain.eq).toHaveBeenCalledWith('id', 'v1');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(result).toBe(video);
    });

    it('returns null when not found', async () => {
      chain.__setResult({ data: null, error: null });
      const result = await repo.getById('v1', 'u1');
      expect(result).toBeNull();
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.getById('v1', 'u1')).rejects.toThrow('boom');
    });
  });

  describe('updateStatus', () => {
    it('resolves when supabase succeeds', async () => {
      chain.__setResult({ data: null, error: null });
      await expect(repo.updateStatus('v1', 'ready')).resolves.toBeUndefined();
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' }),
      );
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.updateStatus('v1', 'ready')).rejects.toThrow('boom');
    });
  });

  describe('updateAnalysis', () => {
    it('includes status in the payload when given', async () => {
      chain.__setResult({ data: null, error: null });
      await repo.updateAnalysis('v1', { foo: 'bar' }, 'ready');
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ analysis: { foo: 'bar' }, status: 'ready' }),
      );
    });

    it('omits status from the payload when not given', async () => {
      chain.__setResult({ data: null, error: null });
      await repo.updateAnalysis('v1', { foo: 'bar' });
      const payload = chain.update.mock.calls[0][0];
      expect(payload.status).toBeUndefined();
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.updateAnalysis('v1', {})).rejects.toThrow('boom');
    });
  });

  describe('updateStoragePath', () => {
    it('resolves on success', async () => {
      chain.__setResult({ data: null, error: null });
      await expect(repo.updateStoragePath('v1', 'new/path')).resolves.toBeUndefined();
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ storage_path: 'new/path' }),
      );
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.updateStoragePath('v1', 'p')).rejects.toThrow('boom');
    });
  });

  describe('updateAfterImport', () => {
    it('passes thumbnail_url through when provided', async () => {
      chain.__setResult({ data: null, error: null });
      await repo.updateAfterImport('v1', {
        storage_path: 'p',
        duration_seconds: 30,
        status: 'ready',
        thumbnail_url: 'thumb.jpg',
      });
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ thumbnail_url: 'thumb.jpg' }),
      );
    });

    it('leaves thumbnail_url undefined when not provided', async () => {
      chain.__setResult({ data: null, error: null });
      await repo.updateAfterImport('v1', {
        storage_path: 'p',
        duration_seconds: 30,
        status: 'ready',
      });
      const payload = chain.update.mock.calls[0][0];
      expect(payload.thumbnail_url).toBeUndefined();
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(
        repo.updateAfterImport('v1', { storage_path: 'p', duration_seconds: 1, status: 'ready' }),
      ).rejects.toThrow('boom');
    });
  });

  describe('recordDeletion', () => {
    it('inserts the audit row', async () => {
      chain.__setResult({ data: null, error: null });
      const entry = {
        video_id: 'v1',
        user_id: 'u1',
        title: 'Ep 4',
        reason: 'retention' as const,
        clip_count: 3,
      };

      await repo.recordDeletion(entry);

      expect(chain.from).toHaveBeenCalledWith('video_deletions');
      expect(chain.insert).toHaveBeenCalledWith(entry);
    });

    it('throws when the insert fails', async () => {
      chain.__setResult({ data: null, error: { message: 'insert denied' } });

      await expect(
        repo.recordDeletion({
          video_id: 'v1', user_id: 'u1', title: null, reason: 'user', clip_count: 0,
        }),
      ).rejects.toThrow('insert denied');
    });
  });

  describe('deleteById', () => {
    it('returns true when a row was deleted', async () => {
      chain.__setResult({ data: { id: 'v1' }, error: null });
      const result = await repo.deleteById('v1', 'u1');
      expect(result).toBe(true);
    });

    it('returns false when no row matched', async () => {
      chain.__setResult({ data: null, error: null });
      const result = await repo.deleteById('v1', 'u1');
      expect(result).toBe(false);
    });

    it('throws when supabase returns an error', async () => {
      chain.__setResult({ data: null, error: { message: 'boom' } });
      await expect(repo.deleteById('v1', 'u1')).rejects.toThrow('boom');
    });
  });
});
