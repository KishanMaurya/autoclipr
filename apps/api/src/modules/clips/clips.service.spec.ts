import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClipsService } from './clips.service';
import { ClipsRepository, type Clip } from './clips.repository';
import { PublicationsRepository } from './publications.repository';
import { PlatformsRepository } from '../platforms/platforms.repository';
import { VideosRepository } from '../videos/videos.repository';
import { InsufficientCreditsError, UsersRepository } from '../users/users.repository';
import { JobsService } from '../jobs/jobs.service';
import { StorageService } from '../storage/storage.service';
import { JobType } from '../jobs/jobs.constants';

function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: 'c1',
    user_id: 'u1',
    video_id: 'v1',
    title: 'Clip 1',
    start_time_ms: 0,
    end_time_ms: 1000,
    storage_path: 'clips/c1.mp4',
    thumbnail_url: null,
    subtitle_url: null,
    status: 'completed',
    ai_score: null,
    viral_score: null,
    duration_seconds: null,
    caption_style: null,
    caption_language: null,
    platform_targets: null,
    export_quality: null,
    viral_metrics: null,
    aspect_ratio: '9:16',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe('ClipsService', () => {
  let service: ClipsService;
  let clipsRepo: jest.Mocked<ClipsRepository>;
  let publicationsRepo: jest.Mocked<PublicationsRepository>;
  let platformsRepo: jest.Mocked<PlatformsRepository>;
  let videosRepo: jest.Mocked<VideosRepository>;
  let usersRepo: jest.Mocked<UsersRepository>;
  let jobsService: jest.Mocked<JobsService>;
  let storage: jest.Mocked<StorageService>;
  let config: { get: jest.Mock };

  beforeEach(() => {
    clipsRepo = {
      listByUser: jest.fn(),
      getById: jest.fn(),
      listByVideoId: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<ClipsRepository>;

    publicationsRepo = {
      listByClipIds: jest.fn().mockResolvedValue([]),
      listByClip: jest.fn(),
      upsertPending: jest.fn(),
    } as unknown as jest.Mocked<PublicationsRepository>;

    platformsRepo = {
      listByUser: jest.fn(),
    } as unknown as jest.Mocked<PlatformsRepository>;

    videosRepo = {
      getById: jest.fn(),
    } as unknown as jest.Mocked<VideosRepository>;

    usersRepo = {
      deductCredits: jest.fn(),
      refundCredits: jest.fn().mockResolvedValue(100),
      getById: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    jobsService = {
      enqueueAndDispatch: jest.fn(),
    } as unknown as jest.Mocked<JobsService>;

    storage = {
      clipThumbPath: jest.fn().mockImplementation((p: string) => `${p}_thumb`),
      parseObjectPathFromUrl: jest.fn().mockReturnValue(null),
      objectExists: jest.fn().mockResolvedValue(false),
      createSignedDownloadUrl: jest.fn().mockResolvedValue(null),
      removeObjects: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StorageService>;

    config = { get: jest.fn().mockReturnValue('clips') };

    service = new ClipsService(
      clipsRepo,
      publicationsRepo,
      platformsRepo,
      videosRepo,
      usersRepo,
      jobsService,
      storage,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config as any,
    );
  });

  describe('generate', () => {
    it('throws NotFoundException when the video does not exist', async () => {
      videosRepo.getById.mockResolvedValue(null);
      await expect(service.generate('u1', { video_id: 'v1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each(['processing', 'analyzing', 'importing'])(
      'throws a "still processing" BadRequestException when status is %s',
      async (status) => {
        videosRepo.getById.mockResolvedValue({ id: 'v1', status } as never);
        await expect(service.generate('u1', { video_id: 'v1' })).rejects.toThrow(
          /still processing/,
        );
      },
    );

    it('throws a "not ready" BadRequestException for any other non-ready status', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'draft' } as never);
      await expect(service.generate('u1', { video_id: 'v1' })).rejects.toThrow(
        /not ready for processing/,
      );
    });

    it('deducts credits using the configured cost per clip and default clip_count', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(5);
      usersRepo.deductCredits.mockResolvedValue(95);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      await service.generate('u1', { video_id: 'v1' });

      expect(usersRepo.deductCredits).toHaveBeenCalledWith(
        'u1',
        15, // 5 * 3 (default clip count)
        'clip_generation',
        'v1',
      );
    });

    it('uses the configured clip_count and applies defaults for job payload fields', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(undefined); // costPerClip fallback = 5
      usersRepo.deductCredits.mockResolvedValue(90);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      await service.generate('u1', { video_id: 'v1', clip_count: 4 });

      expect(usersRepo.deductCredits).toHaveBeenCalledWith('u1', 20, 'clip_generation', 'v1');
      const jobCall = jobsService.enqueueAndDispatch.mock.calls[0][0];
      expect(jobCall.job_type).toBe(JobType.GENERATE_CLIPS);
      expect(jobCall.payload).toMatchObject({
        clip_count: 4,
        aspect_ratio: '9:16',
        with_subtitles: true,
        durations: [15, 30, 45, 60],
        caption_style: 'viral',
        caption_language: 'en',
        platforms: ['tiktok', 'instagram', 'youtube'],
        export_quality: 'hd',
      });
    });

    it('passes through explicit dto overrides into the job payload', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(5);
      usersRepo.deductCredits.mockResolvedValue(90);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      await service.generate('u1', {
        video_id: 'v1',
        aspect_ratio: '16:9',
        with_subtitles: false,
        durations: [10],
        caption_style: 'emoji',
        caption_language: 'de',
        platforms: ['facebook'],
        export_quality: '4k',
      });

      const jobCall = jobsService.enqueueAndDispatch.mock.calls[0][0];
      expect(jobCall.payload).toMatchObject({
        aspect_ratio: '16:9',
        with_subtitles: false,
        durations: [10],
        caption_style: 'emoji',
        caption_language: 'de',
        platforms: ['facebook'],
        export_quality: '4k',
      });
    });

    it('propagates an error from deductCredits (e.g. insufficient credits)', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(5);
      usersRepo.deductCredits.mockRejectedValue(new Error('insufficient credits: need 15, have 3'));

      await expect(service.generate('u1', { video_id: 'v1' })).rejects.toThrow(
        'insufficient credits',
      );
      expect(jobsService.enqueueAndDispatch).not.toHaveBeenCalled();
    });

    it('returns the job returned by the queue', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(5);
      usersRepo.deductCredits.mockResolvedValue(90);
      const job = { id: 'job1' };
      jobsService.enqueueAndDispatch.mockResolvedValue(job as never);

      const result = await service.generate('u1', { video_id: 'v1' });
      expect(result).toBe(job);
    });

    it('maps InsufficientCreditsError to a BadRequestException with the live balance', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(5);
      usersRepo.deductCredits.mockRejectedValue(new InsufficientCreditsError(15));
      usersRepo.getById.mockResolvedValue({ credits: 3 } as never);

      await expect(service.generate('u1', { video_id: 'v1' })).rejects.toThrow(
        /Not enough credits: need 15.*You have 3/,
      );
      expect(jobsService.enqueueAndDispatch).not.toHaveBeenCalled();
    });

    it('reports a zero balance when the profile is missing', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(5);
      usersRepo.deductCredits.mockRejectedValue(new InsufficientCreditsError(15));
      usersRepo.getById.mockResolvedValue(null);

      await expect(service.generate('u1', { video_id: 'v1' })).rejects.toThrow(/You have 0/);
    });

    it('refunds the credits when enqueueing fails after charging', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(5);
      usersRepo.deductCredits.mockResolvedValue(90);
      jobsService.enqueueAndDispatch.mockRejectedValue(new Error('redis down'));

      await expect(service.generate('u1', { video_id: 'v1' })).rejects.toThrow('redis down');

      expect(usersRepo.refundCredits).toHaveBeenCalledWith(
        'u1',
        15,
        'clip_generation_enqueue_failed',
        'v1',
      );
    });

    it('still surfaces the enqueue error when the refund itself fails', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', status: 'ready' } as never);
      config.get.mockReturnValue(5);
      usersRepo.deductCredits.mockResolvedValue(90);
      jobsService.enqueueAndDispatch.mockRejectedValue(new Error('redis down'));
      usersRepo.refundCredits.mockRejectedValue(new Error('refund exploded'));

      await expect(service.generate('u1', { video_id: 'v1' })).rejects.toThrow('redis down');
    });
  });

  describe('list / enrichClip / resolveThumbnailUrl', () => {
    it('returns download_url null and passes through thumbnail_url when clip is not completed', async () => {
      clipsRepo.listByUser.mockResolvedValue({
        items: [makeClip({ status: 'processing', thumbnail_url: 'raw-thumb' })],
        total: 1,
      });

      const result = await service.list('u1', 1, 20);

      expect(result.items[0].download_url).toBeNull();
      expect(result.items[0].thumbnail_url).toBe('raw-thumb');
      expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('returns download_url null when completed but storage_path is missing', async () => {
      clipsRepo.listByUser.mockResolvedValue({
        items: [makeClip({ status: 'completed', storage_path: null })],
        total: 1,
      });

      const result = await service.list('u1', 1, 20);
      expect(result.items[0].download_url).toBeNull();
    });

    it('resolves a signed download URL and thumbnail for completed clips', async () => {
      clipsRepo.listByUser.mockResolvedValue({
        items: [makeClip({ status: 'completed', storage_path: 'clips/c1.mp4' })],
        total: 1,
      });
      storage.createSignedDownloadUrl.mockResolvedValue('https://signed/clip.mp4');
      storage.objectExists.mockResolvedValue(true);

      const result = await service.list('u1', 1, 20);

      expect(result.items[0].download_url).toBe('https://signed/clip.mp4');
      expect(result.items[0].thumbnail_url).toBe('https://signed/clip.mp4');
    });

    it('attaches publications grouped by clip id', async () => {
      const clip = makeClip({ id: 'c1', status: 'processing' });
      clipsRepo.listByUser.mockResolvedValue({ items: [clip], total: 1 });
      publicationsRepo.listByClipIds.mockResolvedValue([
        { id: 'p1', clip_id: 'c1' } as never,
      ]);

      const result = await service.list('u1', 1, 20);
      expect(result.items[0].publications).toEqual([{ id: 'p1', clip_id: 'c1' }]);
    });

    it('resolveThumbnailUrl: adds clipThumbPath(fromStoredUrl) when stored thumbnail_url ends in .mp4', async () => {
      const clip = makeClip({
        status: 'completed',
        storage_path: 'clips/c1.mp4',
        thumbnail_url: 'stored-thumb-url',
      });
      clipsRepo.listByUser.mockResolvedValue({ items: [clip], total: 1 });
      storage.parseObjectPathFromUrl.mockReturnValue('path/to/thumb.mp4');
      storage.objectExists.mockResolvedValue(true);
      storage.createSignedDownloadUrl.mockResolvedValue('https://signed/thumb');

      await service.list('u1', 1, 20);

      expect(storage.clipThumbPath).toHaveBeenCalledWith('path/to/thumb.mp4');
    });

    it('resolveThumbnailUrl: uses the parsed path directly when it does not end in .mp4', async () => {
      const clip = makeClip({
        status: 'completed',
        storage_path: 'clips/c1.mp4',
        thumbnail_url: 'stored-thumb-url',
      });
      clipsRepo.listByUser.mockResolvedValue({ items: [clip], total: 1 });
      storage.parseObjectPathFromUrl.mockReturnValue('path/to/thumb.jpg');
      storage.objectExists.mockImplementation((async (_bucket: string, path: string) =>
        path === 'path/to/thumb.jpg') as never);
      storage.createSignedDownloadUrl.mockResolvedValue('https://signed/thumb.jpg');

      const result = await service.list('u1', 1, 20);
      expect(result.items[0].thumbnail_url).toBe('https://signed/thumb.jpg');
    });

    it('resolveThumbnailUrl: returns null when no candidate exists or signs successfully', async () => {
      const clip = makeClip({ status: 'completed', storage_path: 'clips/c1.mp4' });
      clipsRepo.listByUser.mockResolvedValue({ items: [clip], total: 1 });
      storage.objectExists.mockResolvedValue(false);

      const result = await service.list('u1', 1, 20);
      expect(result.items[0].thumbnail_url).toBeNull();
    });

    it('resolveThumbnailUrl: skips a candidate when createSignedDownloadUrl returns null, tries next', async () => {
      const clip = makeClip({
        status: 'completed',
        storage_path: 'clips/c1.mp4',
        thumbnail_url: 'stored-thumb-url',
      });
      clipsRepo.listByUser.mockResolvedValue({ items: [clip], total: 1 });
      storage.parseObjectPathFromUrl.mockReturnValue('other/thumb.jpg');
      storage.objectExists.mockResolvedValue(true);
      // First candidate signs to null, second candidate succeeds.
      storage.createSignedDownloadUrl
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('https://signed/second');

      const result = await service.list('u1', 1, 20);
      expect(result.items[0].thumbnail_url).toBe('https://signed/second');
    });

    it('resolveThumbnailUrl: skips a falsy candidate path without querying storage', async () => {
      // clip.storage_path is falsy here, exercising the defensive branch in
      // resolveThumbnailUrl (only reachable by calling it directly, since
      // enrichClip's guard never invokes it for clips without a storage_path).
      const clip = makeClip({ storage_path: null, thumbnail_url: null });
      storage.parseObjectPathFromUrl.mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).resolveThumbnailUrl(clip);

      expect(result).toBeNull();
      expect(storage.objectExists).not.toHaveBeenCalled();
    });

    it('resolveThumbnailUrl: continues past an empty-string candidate', async () => {
      const clip = makeClip({ storage_path: 'clips/c1.mp4', thumbnail_url: null });
      storage.clipThumbPath.mockReturnValue('');
      storage.parseObjectPathFromUrl.mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).resolveThumbnailUrl(clip);

      expect(result).toBeNull();
      expect(storage.objectExists).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('throws NotFoundException when the clip does not exist', async () => {
      clipsRepo.getById.mockResolvedValue(null);
      await expect(service.get('u1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('returns the enriched clip with publications', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'processing' }));
      publicationsRepo.listByClip.mockResolvedValue([{ id: 'p1' } as never]);

      const result = await service.get('u1', 'c1');
      expect(result.publications).toEqual([{ id: 'p1' }]);
    });
  });

  describe('getPublications', () => {
    it('throws NotFoundException when the clip does not exist', async () => {
      clipsRepo.getById.mockResolvedValue(null);
      await expect(service.getPublications('u1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('returns publications for the clip', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip());
      publicationsRepo.listByClip.mockResolvedValue([{ id: 'p1' } as never]);
      const result = await service.getPublications('u1', 'c1');
      expect(result).toEqual([{ id: 'p1' }]);
    });
  });

  describe('publish', () => {
    const dto = { platforms: ['youtube' as const] };

    it('throws NotFoundException when the clip does not exist', async () => {
      clipsRepo.getById.mockResolvedValue(null);
      await expect(service.publish('u1', 'c1', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the clip is not completed', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'processing' }));
      await expect(service.publish('u1', 'c1', dto)).rejects.toThrow(
        'Clip is not ready to publish',
      );
    });

    it('throws BadRequestException when the clip has no storage_path', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed', storage_path: null }));
      await expect(service.publish('u1', 'c1', dto)).rejects.toThrow(
        'Clip is not ready to publish',
      );
    });

    it('throws BadRequestException listing platforms that are not connected', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed' }));
      platformsRepo.listByUser.mockResolvedValue([]);
      await expect(
        service.publish('u1', 'c1', { platforms: ['tiktok', 'instagram'] }),
      ).rejects.toThrow('Connect these platforms first: tiktok, instagram');
    });

    it('throws BadRequestException when youtube is connected but not authorized', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed' }));
      platformsRepo.listByUser.mockResolvedValue([
        { platform: 'youtube', auth_status: 'connected', has_tokens: false } as never,
      ]);
      await expect(service.publish('u1', 'c1', dto)).rejects.toThrow(
        'Authorize YouTube posting',
      );
    });

    it('throws BadRequestException when youtube is authorized but missing tokens', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed' }));
      platformsRepo.listByUser.mockResolvedValue([
        { platform: 'youtube', auth_status: 'authorized', has_tokens: false } as never,
      ]);
      await expect(service.publish('u1', 'c1', dto)).rejects.toThrow(
        'Authorize YouTube posting',
      );
    });

    it('enqueues a publish job and creates a pending publication per platform', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed' }));
      platformsRepo.listByUser.mockResolvedValue([
        { platform: 'youtube', auth_status: 'authorized', has_tokens: true } as never,
        { platform: 'tiktok', auth_status: 'connected', has_tokens: false } as never,
      ]);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);
      publicationsRepo.upsertPending.mockResolvedValue({ id: 'pub1' } as never);

      const result = await service.publish('u1', 'c1', { platforms: ['youtube', 'tiktok'] });

      expect(jobsService.enqueueAndDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ job_type: JobType.PUBLISH_CLIP, clip_id: 'c1' }),
      );
      expect(publicationsRepo.upsertPending).toHaveBeenCalledTimes(2);
      expect(result.publications).toHaveLength(2);
      expect(result.job).toEqual({ id: 'job1' });
    });

    it('includes a trimmed title in the payload when dto.title is provided', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed' }));
      platformsRepo.listByUser.mockResolvedValue([
        { platform: 'tiktok', auth_status: 'connected', has_tokens: false } as never,
      ]);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);
      publicationsRepo.upsertPending.mockResolvedValue({ id: 'pub1' } as never);

      await service.publish('u1', 'c1', { platforms: ['tiktok'], title: '  hello  ' });

      const jobCall = jobsService.enqueueAndDispatch.mock.calls[0][0];
      expect(jobCall.payload.title).toBe('hello');
    });

    it('omits the title key from the payload when dto.title is absent', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed' }));
      platformsRepo.listByUser.mockResolvedValue([
        { platform: 'tiktok', auth_status: 'connected', has_tokens: false } as never,
      ]);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);
      publicationsRepo.upsertPending.mockResolvedValue({ id: 'pub1' } as never);

      await service.publish('u1', 'c1', { platforms: ['tiktok'] });

      const jobCall = jobsService.enqueueAndDispatch.mock.calls[0][0];
      expect(jobCall.payload).not.toHaveProperty('title');
    });
  });

  describe('bulkDownloadUrls', () => {
    it('skips clips that are not found', async () => {
      clipsRepo.getById.mockResolvedValueOnce(null).mockResolvedValueOnce(
        makeClip({ id: 'c2', status: 'completed' }),
      );
      storage.createSignedDownloadUrl.mockResolvedValue('https://signed/c2.mp4');

      const result = await service.bulkDownloadUrls('u1', ['c1', 'c2']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c2');
    });

    it('throws BadRequestException when a found clip is not ready for download', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'processing' }));
      await expect(service.bulkDownloadUrls('u1', ['c1'])).rejects.toThrow(
        'Clip c1 is not ready for download',
      );
    });

    it('throws NotFoundException when no clips are found at all', async () => {
      clipsRepo.getById.mockResolvedValue(null);
      await expect(service.bulkDownloadUrls('u1', ['c1', 'c2'])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns mapped download info for found, ready clips', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed', title: 'My Clip' }));
      storage.createSignedDownloadUrl.mockResolvedValue('https://signed/c1.mp4');

      const result = await service.bulkDownloadUrls('u1', ['c1']);
      expect(result).toEqual([
        {
          id: 'c1',
          title: 'My Clip',
          download_url: 'https://signed/c1.mp4',
          thumbnail_url: null,
        },
      ]);
    });
  });

  describe('export', () => {
    it('throws NotFoundException when the clip does not exist', async () => {
      clipsRepo.getById.mockResolvedValue(null);
      await expect(service.export('u1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the clip is not completed', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'processing' }));
      await expect(service.export('u1', 'c1')).rejects.toThrow('Clip is not ready for export');
    });

    it('enqueues an export job for a completed clip', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ status: 'completed' }));
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      const result = await service.export('u1', 'c1');
      expect(jobsService.enqueueAndDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ job_type: JobType.EXPORT_CLIP, clip_id: 'c1' }),
      );
      expect(result).toEqual({ id: 'job1' });
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when the clip does not exist', async () => {
      clipsRepo.getById.mockResolvedValue(null);
      await expect(service.delete('u1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('removes storage assets and deletes the clip row', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ storage_path: 'clips/c1.mp4' }));
      clipsRepo.deleteById.mockResolvedValue(true);

      const result = await service.delete('u1', 'c1');
      expect(storage.removeObjects).toHaveBeenCalledWith(
        'clips',
        expect.arrayContaining(['clips/c1.mp4', 'clips/c1.mp4_thumb']),
      );
      expect(clipsRepo.deleteById).toHaveBeenCalledWith('c1', 'u1');
      expect(result).toEqual({ deleted: true, id: 'c1' });
    });

    it('falls back to the default "clips" bucket when unconfigured', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ storage_path: 'clips/c1.mp4' }));
      clipsRepo.deleteById.mockResolvedValue(true);
      config.get.mockReturnValue(undefined);

      await service.delete('u1', 'c1');
      expect(storage.removeObjects).toHaveBeenCalledWith('clips', expect.any(Array));
    });

    it('also collects a parsed thumbnail path when present', async () => {
      clipsRepo.getById.mockResolvedValue(
        makeClip({ storage_path: 'clips/c1.mp4', thumbnail_url: 'stored-thumb-url' }),
      );
      clipsRepo.deleteById.mockResolvedValue(true);
      storage.parseObjectPathFromUrl.mockImplementation(
        ((url: string | null) => (url === 'stored-thumb-url' ? 'clips/c1_thumb.jpg' : null)) as never,
      );

      await service.delete('u1', 'c1');
      expect(storage.removeObjects).toHaveBeenCalledWith(
        'clips',
        expect.arrayContaining(['clips/c1_thumb.jpg']),
      );
    });

    it('also collects a parsed subtitle path when present', async () => {
      clipsRepo.getById.mockResolvedValue(
        makeClip({ storage_path: 'clips/c1.mp4', subtitle_url: 'stored-subtitle-url' }),
      );
      clipsRepo.deleteById.mockResolvedValue(true);
      storage.parseObjectPathFromUrl.mockImplementation(
        ((url: string | null) => (url === 'stored-subtitle-url' ? 'clips/c1.srt' : null)) as never,
      );

      await service.delete('u1', 'c1');
      expect(storage.removeObjects).toHaveBeenCalledWith(
        'clips',
        expect.arrayContaining(['clips/c1.srt']),
      );
    });

    it('swallows storage removal errors and still deletes the clip row', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ storage_path: 'clips/c1.mp4' }));
      storage.removeObjects.mockRejectedValue(new Error('storage down'));
      clipsRepo.deleteById.mockResolvedValue(true);

      const result = await service.delete('u1', 'c1');
      expect(result).toEqual({ deleted: true, id: 'c1' });
    });

    it('does not call removeObjects when there are no storage paths', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ storage_path: null }));
      clipsRepo.deleteById.mockResolvedValue(true);

      await service.delete('u1', 'c1');
      expect(storage.removeObjects).not.toHaveBeenCalled();
    });
  });

  describe('bulkDelete', () => {
    it('skips clips that are not found', async () => {
      clipsRepo.getById.mockResolvedValueOnce(null).mockResolvedValueOnce(makeClip({ id: 'c2' }));
      clipsRepo.deleteById.mockResolvedValue(true);

      const result = await service.bulkDelete('u1', ['c1', 'c2']);
      expect(result.deleted_ids).toEqual(['c2']);
    });

    it('only counts ids where deleteById returns true', async () => {
      clipsRepo.getById.mockResolvedValue(makeClip({ id: 'c1' }));
      clipsRepo.deleteById.mockResolvedValue(false);

      await expect(service.bulkDelete('u1', ['c1'])).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      clipsRepo.getById.mockResolvedValue(null);
      await expect(service.bulkDelete('u1', ['c1', 'c2'])).rejects.toThrow(NotFoundException);
    });

    it('returns deleted_ids for successfully deleted clips', async () => {
      clipsRepo.getById.mockImplementation((async (id: string) => makeClip({ id })) as never);
      clipsRepo.deleteById.mockResolvedValue(true);

      const result = await service.bulkDelete('u1', ['c1', 'c2']);
      expect(result).toEqual({ deleted_ids: ['c1', 'c2'] });
    });
  });
});
