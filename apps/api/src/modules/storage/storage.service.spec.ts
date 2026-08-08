import { ConfigService } from '@nestjs/config';
import { mockStorageBucket } from '../../test-utils/supabase-mock';

const mockCreateServerSupabaseClient = jest.fn();
jest.mock('../../common/supabase-client', () => ({
  createServerSupabaseClient: (...args: unknown[]) => mockCreateServerSupabaseClient(...args),
}));

// Import after the mock is registered so StorageService picks up the mocked factory.
import { StorageService } from './storage.service';

function makeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('StorageService', () => {
  beforeEach(() => {
    mockCreateServerSupabaseClient.mockReset();
  });

  describe('construction', () => {
    it('creates a supabase client when url and key are configured', () => {
      const fakeClient = { storage: { from: jest.fn() } };
      mockCreateServerSupabaseClient.mockReturnValue(fakeClient);
      const config = makeConfig({ supabaseUrl: 'https://proj.supabase.co', supabaseServiceKey: 'service-key' });

      new StorageService(config);

      expect(mockCreateServerSupabaseClient).toHaveBeenCalledWith('https://proj.supabase.co', 'service-key');
    });

    it('does not create a client when url or key is missing', () => {
      const config = makeConfig({ supabaseUrl: undefined, supabaseServiceKey: undefined });
      new StorageService(config);
      expect(mockCreateServerSupabaseClient).not.toHaveBeenCalled();
    });
  });

  describe('createUploadPath', () => {
    it('builds a path prefixed by userId and a timestamp', () => {
      const config = makeConfig({});
      const service = new StorageService(config);
      const path = service.createUploadPath('user-123', 'my file.mp4');
      expect(path).toMatch(/^user-123\/\d+_my file\.mp4$/);
    });
  });

  describe('createSignedUploadUrl', () => {
    it('returns a fallback url when the client is not configured', async () => {
      const config = makeConfig({ supabaseUrl: 'https://proj.supabase.co' }); // no service key -> no client
      const service = new StorageService(config);
      const result = await service.createSignedUploadUrl('u1/file.mp4', 'videos');
      expect(result).toEqual({
        signedUrl: 'https://proj.supabase.co/storage/v1/object/videos/u1/file.mp4',
        path: 'u1/file.mp4',
      });
    });

    it('creates a signed upload url via the client when configured', async () => {
      const bucket = mockStorageBucket({
        createSignedUploadUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed', path: 'u1/f.mp4' }, error: null }),
      });
      const fakeClient = { storage: { from: jest.fn().mockReturnValue(bucket) } };
      mockCreateServerSupabaseClient.mockReturnValue(fakeClient);
      const config = makeConfig({ supabaseUrl: 'https://proj.supabase.co', supabaseServiceKey: 'key' });
      const service = new StorageService(config);

      const result = await service.createSignedUploadUrl('u1/file.mp4', 'videos');

      expect(fakeClient.storage.from).toHaveBeenCalledWith('videos');
      expect(bucket.createSignedUploadUrl).toHaveBeenCalledWith('u1/file.mp4', { upsert: true });
      expect(result).toEqual({ signedUrl: 'https://signed', path: 'u1/file.mp4' });
    });

    it('throws when the client returns an error', async () => {
      const bucket = mockStorageBucket({
        createSignedUploadUrl: jest.fn().mockResolvedValue({ data: null, error: { message: 'denied' } }),
      });
      const fakeClient = { storage: { from: jest.fn().mockReturnValue(bucket) } };
      mockCreateServerSupabaseClient.mockReturnValue(fakeClient);
      const config = makeConfig({ supabaseUrl: 'https://proj.supabase.co', supabaseServiceKey: 'key' });
      const service = new StorageService(config);

      await expect(service.createSignedUploadUrl('u1/file.mp4', 'videos')).rejects.toThrow('denied');
    });

    it('throws a generic message when there is no data and no error', async () => {
      const bucket = mockStorageBucket({
        createSignedUploadUrl: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      const fakeClient = { storage: { from: jest.fn().mockReturnValue(bucket) } };
      mockCreateServerSupabaseClient.mockReturnValue(fakeClient);
      const config = makeConfig({ supabaseUrl: 'https://proj.supabase.co', supabaseServiceKey: 'key' });
      const service = new StorageService(config);

      await expect(service.createSignedUploadUrl('u1/file.mp4', 'videos')).rejects.toThrow(
        'Failed to create signed upload URL',
      );
    });
  });

  describe('bucket name getters', () => {
    it('clipsBucket falls back to "clips"', () => {
      const service = new StorageService(makeConfig({}));
      expect(service.clipsBucket()).toBe('clips');
    });

    it('clipsBucket uses configured value', () => {
      const service = new StorageService(makeConfig({ 'buckets.clips': 'custom-clips' }));
      expect(service.clipsBucket()).toBe('custom-clips');
    });

    it('videosBucket falls back through config -> env -> default', () => {
      const service = new StorageService(makeConfig({}));
      delete process.env.STORAGE_BUCKET_VIDEOS;
      expect(service.videosBucket()).toBe('videos');
    });

    it('videosBucket uses STORAGE_BUCKET_VIDEOS env var when config is absent', () => {
      const service = new StorageService(makeConfig({}));
      process.env.STORAGE_BUCKET_VIDEOS = 'env-videos';
      expect(service.videosBucket()).toBe('env-videos');
      delete process.env.STORAGE_BUCKET_VIDEOS;
    });

    it('videosBucket prefers config value over env var', () => {
      const service = new StorageService(makeConfig({ 'buckets.videos': 'config-videos' }));
      process.env.STORAGE_BUCKET_VIDEOS = 'env-videos';
      expect(service.videosBucket()).toBe('config-videos');
      delete process.env.STORAGE_BUCKET_VIDEOS;
    });

    it('avatarsBucket falls back to "avatars"', () => {
      const service = new StorageService(makeConfig({}));
      expect(service.avatarsBucket()).toBe('avatars');
    });

    it('avatarsBucket uses configured value', () => {
      const service = new StorageService(makeConfig({ 'buckets.avatars': 'custom-avatars' }));
      expect(service.avatarsBucket()).toBe('custom-avatars');
    });
  });

  describe('getPublicObjectUrl', () => {
    it('builds the public object url, stripping a trailing slash from the base', () => {
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://proj.supabase.co/' }));
      expect(service.getPublicObjectUrl('videos', 'u1/f.mp4')).toBe(
        'https://proj.supabase.co/storage/v1/object/public/videos/u1/f.mp4',
      );
    });

    it('handles a missing supabaseUrl gracefully', () => {
      const service = new StorageService(makeConfig({}));
      expect(service.getPublicObjectUrl('videos', 'u1/f.mp4')).toBe('/storage/v1/object/public/videos/u1/f.mp4');
    });
  });

  describe('clipThumbPath', () => {
    it('returns an empty string for a falsy path', () => {
      const service = new StorageService(makeConfig({}));
      expect(service.clipThumbPath('')).toBe('');
    });

    it('returns the path unchanged when it already ends in _thumb.jpg', () => {
      const service = new StorageService(makeConfig({}));
      expect(service.clipThumbPath('u1/clip_thumb.jpg')).toBe('u1/clip_thumb.jpg');
    });

    it('returns the path unchanged when it already ends in _thumb.jpeg', () => {
      const service = new StorageService(makeConfig({}));
      expect(service.clipThumbPath('u1/clip_thumb.jpeg')).toBe('u1/clip_thumb.jpeg');
    });

    it('replaces a .mp4 extension with _thumb.jpg', () => {
      const service = new StorageService(makeConfig({}));
      expect(service.clipThumbPath('u1/clip.mp4')).toBe('u1/clip_thumb.jpg');
    });

    it('leaves a non-mp4, non-thumb path unchanged', () => {
      const service = new StorageService(makeConfig({}));
      expect(service.clipThumbPath('u1/clip.mov')).toBe('u1/clip.mov');
    });
  });

  describe('parseObjectPathFromUrl', () => {
    const service = new StorageService(makeConfig({}));

    it('returns null for a null/undefined url', () => {
      expect(service.parseObjectPathFromUrl(null, 'videos')).toBeNull();
      expect(service.parseObjectPathFromUrl(undefined, 'videos')).toBeNull();
    });

    it('returns null when the url has no storage marker', () => {
      expect(service.parseObjectPathFromUrl('https://example.com/nope', 'videos')).toBeNull();
    });

    it('parses a public object url', () => {
      const url = 'https://proj.supabase.co/storage/v1/object/public/videos/u1/f.mp4';
      expect(service.parseObjectPathFromUrl(url, 'videos')).toBe('u1/f.mp4');
    });

    it('parses a signed ("sign") object url and strips the query string', () => {
      const url = 'https://proj.supabase.co/storage/v1/object/sign/videos/u1/f.mp4?token=abc';
      expect(service.parseObjectPathFromUrl(url, 'videos')).toBe('u1/f.mp4');
    });

    it('parses an "authenticated" object url', () => {
      const url = 'https://proj.supabase.co/storage/v1/object/authenticated/videos/u1/f.mp4';
      expect(service.parseObjectPathFromUrl(url, 'videos')).toBe('u1/f.mp4');
    });

    it('parses a url with no public/sign/authenticated segment', () => {
      const url = 'https://proj.supabase.co/storage/v1/object/videos/u1/f.mp4';
      expect(service.parseObjectPathFromUrl(url, 'videos')).toBe('u1/f.mp4');
    });

    it('returns null when the bucket in the url does not match', () => {
      const url = 'https://proj.supabase.co/storage/v1/object/public/other-bucket/u1/f.mp4';
      expect(service.parseObjectPathFromUrl(url, 'videos')).toBeNull();
    });

    it('returns null when there is no object path after the bucket', () => {
      const url = 'https://proj.supabase.co/storage/v1/object/public/videos';
      expect(service.parseObjectPathFromUrl(url, 'videos')).toBeNull();
    });
  });

  describe('objectExists', () => {
    it('returns false when the client is not configured', async () => {
      const service = new StorageService(makeConfig({}));
      await expect(service.objectExists('videos', 'u1/f.mp4')).resolves.toBe(false);
    });

    it('returns false when objectPath is empty', async () => {
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn() } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));
      await expect(service.objectExists('videos', '')).resolves.toBe(false);
    });

    it('returns true when the file is found in the listing', async () => {
      const bucket = mockStorageBucket({
        list: jest.fn().mockResolvedValue({ data: [{ name: 'f.mp4' }], error: null }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.objectExists('videos', 'u1/f.mp4')).resolves.toBe(true);
      expect(bucket.list).toHaveBeenCalledWith('u1', { search: 'f.mp4', limit: 1 });
    });

    it('handles a top-level object path (no directory segment)', async () => {
      const bucket = mockStorageBucket({
        list: jest.fn().mockResolvedValue({ data: [{ name: 'f.mp4' }], error: null }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.objectExists('videos', 'f.mp4')).resolves.toBe(true);
      expect(bucket.list).toHaveBeenCalledWith('', { search: 'f.mp4', limit: 1 });
    });

    it('returns false when the exact name is not present in the listing', async () => {
      const bucket = mockStorageBucket({
        list: jest.fn().mockResolvedValue({ data: [{ name: 'other.mp4' }], error: null }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.objectExists('videos', 'u1/f.mp4')).resolves.toBe(false);
    });

    it('returns false when the client errors', async () => {
      const bucket = mockStorageBucket({
        list: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.objectExists('videos', 'u1/f.mp4')).resolves.toBe(false);
    });

    it('returns false when the listing is empty', async () => {
      const bucket = mockStorageBucket({
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.objectExists('videos', 'u1/f.mp4')).resolves.toBe(false);
    });
  });

  describe('createSignedDownloadUrl', () => {
    it('returns null when the client is not configured', async () => {
      const service = new StorageService(makeConfig({}));
      await expect(service.createSignedDownloadUrl('videos', 'u1/f.mp4')).resolves.toBeNull();
    });

    it('returns null when objectPath is empty', async () => {
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn() } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));
      await expect(service.createSignedDownloadUrl('videos', '')).resolves.toBeNull();
    });

    it('returns the signed url on success, using the default expiry', async () => {
      const bucket = mockStorageBucket({
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed-download' }, error: null }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.createSignedDownloadUrl('videos', 'u1/f.mp4')).resolves.toBe('https://signed-download');
      expect(bucket.createSignedUrl).toHaveBeenCalledWith('u1/f.mp4', 3600);
    });

    it('forwards a custom expiry', async () => {
      const bucket = mockStorageBucket({
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed-download' }, error: null }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await service.createSignedDownloadUrl('videos', 'u1/f.mp4', 60);
      expect(bucket.createSignedUrl).toHaveBeenCalledWith('u1/f.mp4', 60);
    });

    it('returns null when the client errors', async () => {
      const bucket = mockStorageBucket({
        createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: { message: 'denied' } }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.createSignedDownloadUrl('videos', 'u1/f.mp4')).resolves.toBeNull();
    });

    it('returns null when there is no signedUrl in the data', async () => {
      const bucket = mockStorageBucket({
        createSignedUrl: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.createSignedDownloadUrl('videos', 'u1/f.mp4')).resolves.toBeNull();
    });
  });

  describe('removeObjects', () => {
    it('does nothing when the client is not configured', async () => {
      const service = new StorageService(makeConfig({}));
      await expect(service.removeObjects('videos', ['u1/f.mp4'])).resolves.toBeUndefined();
    });

    it('does nothing when the path list is empty', async () => {
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn() } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));
      await service.removeObjects('videos', []);
      // storage.from should never be reached because objectPaths.length is falsy
    });

    it('dedupes and filters falsy paths before calling remove', async () => {
      const bucket = mockStorageBucket({ remove: jest.fn().mockResolvedValue({ error: null }) });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await service.removeObjects('videos', ['a', 'a', '', 'b']);
      expect(bucket.remove).toHaveBeenCalledWith(['a', 'b']);
    });

    it('throws when the client errors', async () => {
      const bucket = mockStorageBucket({ remove: jest.fn().mockResolvedValue({ error: { message: 'delete failed' } }) });
      mockCreateServerSupabaseClient.mockReturnValue({ storage: { from: jest.fn().mockReturnValue(bucket) } });
      const service = new StorageService(makeConfig({ supabaseUrl: 'https://x', supabaseServiceKey: 'k' }));

      await expect(service.removeObjects('videos', ['a'])).rejects.toThrow('delete failed');
    });
  });
});
