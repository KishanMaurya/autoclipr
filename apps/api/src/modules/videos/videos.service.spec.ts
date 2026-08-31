import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosRepository } from './videos.repository';
import { ClipsRepository } from '../clips/clips.repository';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';
import { JobsRepository } from '../jobs/jobs.repository';
import { InsufficientCreditsError, UsersRepository } from '../users/users.repository';
import { JobType } from '../jobs/jobs.constants';

describe('VideosService', () => {
  let service: VideosService;
  let videosRepo: jest.Mocked<VideosRepository>;
  let clipsRepo: jest.Mocked<ClipsRepository>;
  let storage: jest.Mocked<StorageService>;
  let jobsService: jest.Mocked<JobsService>;
  let jobsRepo: jest.Mocked<JobsRepository>;
  let usersRepo: jest.Mocked<UsersRepository>;
  let monitoring: { recordEvent: jest.Mock; noticeError: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    videosRepo = {
      create: jest.fn(),
      listByUser: jest.fn(),
      getById: jest.fn(),
      updateStatus: jest.fn(),
      updateAnalysis: jest.fn(),
      updateStoragePath: jest.fn(),
      updateAfterImport: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<VideosRepository>;

    clipsRepo = {
      listByVideoId: jest.fn(),
    } as unknown as jest.Mocked<ClipsRepository>;

    storage = {
      createUploadPath: jest.fn(),
      createSignedUploadUrl: jest.fn(),
      clipThumbPath: jest.fn(),
      parseObjectPathFromUrl: jest.fn(),
      removeObjects: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    jobsService = {
      enqueueAndDispatch: jest.fn(),
      getBullJobState: jest.fn(),
      redispatchQueuedJob: jest.fn(),
    } as unknown as jest.Mocked<JobsService>;

    jobsRepo = {
      findLatestByVideo: jest.fn(),
    } as unknown as jest.Mocked<JobsRepository>;

    usersRepo = {
      getById: jest.fn(),
      deductCredits: jest.fn().mockResolvedValue(90),
      refundCredits: jest.fn().mockResolvedValue(100),
    } as unknown as jest.Mocked<UsersRepository>;

    monitoring = { recordEvent: jest.fn(), noticeError: jest.fn() };
    config = { get: jest.fn() };

    service = new VideosService(
      videosRepo,
      clipsRepo,
      storage,
      jobsService,
      jobsRepo,
      usersRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      monitoring as any,
      config as any,
    );
  });

  describe('initUpload', () => {
    it('uses the configured bucket and returns upload info', async () => {
      config.get.mockReturnValue('custom-videos-bucket');
      storage.createUploadPath.mockReturnValue('u1/123_file.mp4');
      storage.createSignedUploadUrl.mockResolvedValue({
        signedUrl: 'https://signed.example/upload',
        path: 'u1/123_file.mp4',
      });
      videosRepo.create.mockResolvedValue({ id: 'v1' } as never);
      usersRepo.getById.mockResolvedValue({ subscription_tier: 'pro' } as never);

      const result = await service.initUpload('u1', {
        title: 'My video',
        filename: 'file.mp4',
        mime_type: 'video/mp4',
        size: 100,
      });

      expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(
        'u1/123_file.mp4',
        'custom-videos-bucket',
      );
      expect(videosRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'My video',
          status: 'uploading',
          source_type: 'upload',
        }),
      );
      expect(monitoring.recordEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ userId: 'u1', videoId: 'v1', plan: 'pro' }),
      );
      expect(result).toEqual({
        video_id: 'v1',
        upload_url: 'https://signed.example/upload',
        storage_path: 'u1/123_file.mp4',
      });
    });

    it('falls back to STORAGE_BUCKET_VIDEOS env var when config has no bucket', async () => {
      config.get.mockReturnValue(undefined);
      process.env.STORAGE_BUCKET_VIDEOS = 'env-bucket';
      storage.createUploadPath.mockReturnValue('path');
      storage.createSignedUploadUrl.mockResolvedValue({ signedUrl: 'url', path: 'path' });
      videosRepo.create.mockResolvedValue({ id: 'v1' } as never);
      usersRepo.getById.mockResolvedValue(null);

      await service.initUpload('u1', { title: 't', filename: 'f.mp4' });

      expect(storage.createSignedUploadUrl).toHaveBeenCalledWith('path', 'env-bucket');
      delete process.env.STORAGE_BUCKET_VIDEOS;
    });

    it('falls back to "videos" when neither config nor env var is set', async () => {
      config.get.mockReturnValue(undefined);
      delete process.env.STORAGE_BUCKET_VIDEOS;
      storage.createUploadPath.mockReturnValue('path');
      storage.createSignedUploadUrl.mockResolvedValue({ signedUrl: 'url', path: 'path' });
      videosRepo.create.mockResolvedValue({ id: 'v1' } as never);
      usersRepo.getById.mockResolvedValue(null);

      await service.initUpload('u1', { title: 't', filename: 'f.mp4' });

      expect(storage.createSignedUploadUrl).toHaveBeenCalledWith('path', 'videos');
    });

    it('defaults plan to "free" when the profile is missing', async () => {
      config.get.mockReturnValue('videos');
      storage.createUploadPath.mockReturnValue('path');
      storage.createSignedUploadUrl.mockResolvedValue({ signedUrl: 'url', path: 'path' });
      videosRepo.create.mockResolvedValue({ id: 'v1' } as never);
      usersRepo.getById.mockResolvedValue(null);

      await service.initUpload('u1', { title: 't', filename: 'f.mp4' });

      expect(monitoring.recordEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ plan: 'free' }),
      );
    });
  });

  describe('importFromUrl', () => {
    const dto = { url: 'https://www.youtube.com/watch?v=abc123' };

    it('throws BadRequestException for an unsupported URL', async () => {
      await expect(
        service.importFromUrl('u1', { url: 'https://example.com/page' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the atomic deduction reports insufficient credits', async () => {
      config.get.mockReturnValue(2); // clipCreditCost
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      usersRepo.deductCredits.mockRejectedValue(new InsufficientCreditsError(20));
      usersRepo.getById.mockResolvedValue({ credits: 5 } as never);

      await expect(
        service.importFromUrl('u1', { ...dto, clip_count: 10 }),
      ).rejects.toThrow(/Not enough credits: need 20/);
    });

    it('treats a missing profile as zero credits in the rejection message', async () => {
      config.get.mockReturnValue(1);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      usersRepo.deductCredits.mockRejectedValue(new InsufficientCreditsError(10));
      usersRepo.getById.mockResolvedValue(null);

      await expect(service.importFromUrl('u1', dto)).rejects.toThrow(/You have 0/);
    });

    it('never enqueues a job when the deduction is rejected', async () => {
      config.get.mockReturnValue(1);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      usersRepo.deductCredits.mockRejectedValue(new InsufficientCreditsError(10));
      usersRepo.getById.mockResolvedValue({ credits: 0 } as never);

      await expect(service.importFromUrl('u1', dto)).rejects.toThrow(BadRequestException);

      expect(jobsService.enqueueAndDispatch).not.toHaveBeenCalled();
      expect(videosRepo.updateStatus).toHaveBeenCalledWith('v1', 'failed');
    });

    it('charges credits before the job is enqueued, not after processing', async () => {
      // Regression guard: the old flow only *checked* the balance here and
      // deducted inside the worker after the pipeline finished, so concurrent
      // requests could all pass the check and overspend.
      const callOrder: string[] = [];
      config.get.mockReturnValue(1);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      usersRepo.deductCredits.mockImplementation(async () => {
        callOrder.push('deduct');
        return 90;
      });
      jobsService.enqueueAndDispatch.mockImplementation(async () => {
        callOrder.push('enqueue');
        return { id: 'job1' } as never;
      });

      await service.importFromUrl('u1', dto);

      expect(callOrder).toEqual(['deduct', 'enqueue']);
      expect(usersRepo.deductCredits).toHaveBeenCalledWith(
        'u1',
        10,
        'url_import_pipeline',
        'v1',
      );
    });

    it('refunds the credits when enqueueing fails after charging', async () => {
      config.get.mockReturnValue(1);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockRejectedValue(new Error('redis down'));

      await expect(service.importFromUrl('u1', dto)).rejects.toThrow('redis down');

      expect(usersRepo.refundCredits).toHaveBeenCalledWith(
        'u1',
        10,
        'url_import_enqueue_failed',
        'v1',
      );
      expect(videosRepo.updateStatus).toHaveBeenCalledWith('v1', 'failed');
    });

    it('still surfaces the enqueue error when the refund itself fails', async () => {
      config.get.mockReturnValue(1);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockRejectedValue(new Error('redis down'));
      usersRepo.refundCredits.mockRejectedValue(new Error('refund exploded'));

      await expect(service.importFromUrl('u1', dto)).rejects.toThrow('redis down');
      expect(monitoring.noticeError).toHaveBeenCalled();
    });

    it('wraps a non-Error refund rejection before reporting it', async () => {
      config.get.mockReturnValue(1);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockRejectedValue(new Error('redis down'));
      usersRepo.refundCredits.mockRejectedValue('refund string failure');

      await expect(service.importFromUrl('u1', dto)).rejects.toThrow('redis down');
      expect(monitoring.noticeError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'refund string failure' }),
        expect.objectContaining({ source: 'refundCredits' }),
      );
    });

    it('propagates a non-insufficient deduction error unchanged', async () => {
      config.get.mockReturnValue(1);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      usersRepo.deductCredits.mockRejectedValue(new Error('db exploded'));

      await expect(service.importFromUrl('u1', dto)).rejects.toThrow('db exploded');
      expect(jobsService.enqueueAndDispatch).not.toHaveBeenCalled();
    });

    it('uses default clip_count (10) and costPerClip (1) when not configured/provided', async () => {
      config.get.mockReturnValue(undefined);
      usersRepo.getById.mockResolvedValue({ credits: 100 } as never);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 'YouTube import · x' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      await service.importFromUrl('u1', dto);

      const jobCall = jobsService.enqueueAndDispatch.mock.calls[0][0];
      expect(jobCall.payload.credit_cost).toBe(10); // 1 * 10
      expect(jobCall.payload.clip_count).toBe(10);
    });

    it('generates a default title when dto.title is blank/whitespace', async () => {
      config.get.mockReturnValue(1);
      usersRepo.getById.mockResolvedValue({ credits: 100 } as never);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 'generated' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      await service.importFromUrl('u1', { ...dto, title: '   ' });

      const createCall = videosRepo.create.mock.calls[0][0];
      expect(createCall.title).toMatch(/YouTube import/);
    });

    it('uses the trimmed dto.title when provided', async () => {
      config.get.mockReturnValue(1);
      usersRepo.getById.mockResolvedValue({ credits: 100 } as never);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 'My Title' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      await service.importFromUrl('u1', { ...dto, title: '  My Title  ' });

      const createCall = videosRepo.create.mock.calls[0][0];
      expect(createCall.title).toBe('My Title');
    });

    it('applies defaults for durations/caption_style/platforms/etc when omitted', async () => {
      config.get.mockReturnValue(1);
      usersRepo.getById.mockResolvedValue({ credits: 100 } as never);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      await service.importFromUrl('u1', dto);

      const jobCall = jobsService.enqueueAndDispatch.mock.calls[0][0];
      expect(jobCall.job_type).toBe(JobType.URL_PIPELINE);
      expect(jobCall.payload).toMatchObject({
        durations: [15, 30, 45, 60],
        caption_style: 'viral',
        caption_language: 'en',
        platforms: ['tiktok', 'instagram', 'youtube', 'linkedin'],
        export_quality: 'hd',
        auto_publish: false,
      });
    });

    it('passes through explicit dto overrides into the job payload', async () => {
      config.get.mockReturnValue(1);
      usersRepo.getById.mockResolvedValue({ credits: 100 } as never);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 't' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      await service.importFromUrl('u1', {
        ...dto,
        durations: [5],
        caption_style: 'emoji',
        caption_language: 'fr',
        platforms: ['tiktok'],
        export_quality: '4k',
        auto_publish: true,
      });

      const jobCall = jobsService.enqueueAndDispatch.mock.calls[0][0];
      expect(jobCall.payload).toMatchObject({
        durations: [5],
        caption_style: 'emoji',
        caption_language: 'fr',
        platforms: ['tiktok'],
        export_quality: '4k',
        auto_publish: true,
      });
    });

    it('returns the expected response shape on success', async () => {
      config.get.mockReturnValue(1);
      usersRepo.getById.mockResolvedValue({ credits: 100 } as never);
      videosRepo.create.mockResolvedValue({ id: 'v1', title: 'My Title' } as never);
      videosRepo.updateStoragePath.mockResolvedValue(undefined);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      const result = await service.importFromUrl('u1', dto);

      expect(result).toEqual({
        video_id: 'v1',
        job_id: 'job1',
        source_type: 'youtube',
        source_label: 'YouTube',
        title: 'My Title',
        status: 'importing',
      });
      expect(videosRepo.updateStoragePath).toHaveBeenCalledWith('v1', 'url-import:v1');
    });
  });

  describe('getPipeline', () => {
    it('throws NotFoundException when the video does not exist', async () => {
      videosRepo.getById.mockResolvedValue(null);
      await expect(service.getPipeline('u1', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('returns defaults when there is no job', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        title: 't',
        status: 'ready',
        source_url: null,
        source_type: null,
        analysis: null,
      } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue(null);

      const result = await service.getPipeline('u1', 'v1');

      expect(result.job).toBeNull();
      expect(result.steps).toEqual([]);
      expect(result.clips_created).toBe(0);
      expect(result.progress_percent).toBe(0);
      expect(result.queue_state).toBeNull();
      expect(result.queue_hint).toBeNull();
    });

    it('leaves queue_hint null when the job is queued with an unrecognized queue state', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', title: 't', status: 'importing', analysis: null } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'queued',
        job_type: 'x',
        error_message: null,
        result: {},
      } as never);
      jobsService.getBullJobState.mockResolvedValue('completed');

      const result = await service.getPipeline('u1', 'v1');
      expect(result.queue_hint).toBeNull();
      expect(result.queue_state).toBe('completed');
    });

    it('uses video.analysis when present, falling back to result.analysis, then null', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        title: 't',
        status: 'ready',
        analysis: { a: 1 },
      } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'completed',
        job_type: 'analyze_video',
        error_message: null,
        result: { analysis: { b: 2 } },
      } as never);

      const result = await service.getPipeline('u1', 'v1');
      expect(result.analysis).toEqual({ a: 1 });
    });

    it('falls back to result.analysis when video.analysis is null', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', title: 't', status: 'ready', analysis: null } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'completed',
        job_type: 'x',
        error_message: null,
        result: { analysis: { b: 2 } },
      } as never);

      const result = await service.getPipeline('u1', 'v1');
      expect(result.analysis).toEqual({ b: 2 });
    });

    it('sets progress to 2 when queued and progress_percent is 0', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', title: 't', status: 'importing', analysis: null } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'queued',
        job_type: 'x',
        error_message: null,
        result: {},
      } as never);
      jobsService.getBullJobState.mockResolvedValue('waiting');

      const result = await service.getPipeline('u1', 'v1');
      expect(result.progress_percent).toBe(2);
      expect(result.queue_state).toBe('waiting');
      expect(result.queue_hint).toMatch(/waiting in the queue/);
    });

    it('uses progressFromResult unmodified when job is not queued', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', title: 't', status: 'processing', analysis: null } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'active',
        job_type: 'x',
        error_message: null,
        result: { progress_percent: 42 },
      } as never);

      const result = await service.getPipeline('u1', 'v1');
      expect(result.progress_percent).toBe(42);
      expect(result.queue_state).toBeNull();
    });

    it('sets an "active" queue hint', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', title: 't', status: 'importing', analysis: null } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'queued',
        job_type: 'x',
        error_message: null,
        result: {},
      } as never);
      jobsService.getBullJobState.mockResolvedValue('active');

      const result = await service.getPipeline('u1', 'v1');
      expect(result.queue_hint).toBe('Processing is starting…');
    });

    it('redispatches a missing job and reports requeued when successful', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', title: 't', status: 'importing', analysis: null } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'queued',
        job_type: 'x',
        error_message: null,
        result: {},
      } as never);
      jobsService.getBullJobState
        .mockResolvedValueOnce('missing')
        .mockResolvedValueOnce('waiting');
      jobsService.redispatchQueuedJob.mockResolvedValue(undefined);

      const result = await service.getPipeline('u1', 'v1');
      expect(jobsService.redispatchQueuedJob).toHaveBeenCalledWith('j1');
      expect(result.queue_hint).toBe('Job re-queued — processing will start shortly.');
    });

    it('reports a generic re-queue message when the state is not waiting/delayed after redispatch', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', title: 't', status: 'importing', analysis: null } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'queued',
        job_type: 'x',
        error_message: null,
        result: {},
      } as never);
      jobsService.getBullJobState
        .mockResolvedValueOnce('missing')
        .mockResolvedValueOnce('active');
      jobsService.redispatchQueuedJob.mockResolvedValue(undefined);

      const result = await service.getPipeline('u1', 'v1');
      expect(result.queue_hint).toMatch(/Re-queued your job/);
    });

    it('reports a not-found hint when redispatch throws', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1', title: 't', status: 'importing', analysis: null } as never);
      jobsRepo.findLatestByVideo.mockResolvedValue({
        id: 'j1',
        status: 'queued',
        job_type: 'x',
        error_message: null,
        result: {},
      } as never);
      jobsService.getBullJobState.mockResolvedValueOnce('missing');
      jobsService.redispatchQueuedJob.mockRejectedValue(new Error('nope'));

      const result = await service.getPipeline('u1', 'v1');
      expect(result.queue_hint).toMatch(/Job was not found in the queue/);
    });
  });

  describe('completeUpload', () => {
    it('throws NotFoundException when the video does not exist', async () => {
      videosRepo.getById.mockResolvedValue(null);
      await expect(service.completeUpload('u1', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('updates status, enqueues an analyze job, and returns processing status', async () => {
      videosRepo.getById.mockResolvedValue({ id: 'v1' } as never);
      jobsService.enqueueAndDispatch.mockResolvedValue({ id: 'job1' } as never);

      const result = await service.completeUpload('u1', 'v1');

      expect(videosRepo.updateStatus).toHaveBeenCalledWith('v1', 'processing');
      expect(jobsService.enqueueAndDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ job_type: JobType.ANALYZE_VIDEO, video_id: 'v1' }),
      );
      expect(result).toEqual({ status: 'processing' });
    });
  });

  describe('list', () => {
    it('computes the correct offset and delegates to the repository', async () => {
      videosRepo.listByUser.mockResolvedValue({ items: [], total: 0 } as never);
      await service.list('u1', 3, 20);
      expect(videosRepo.listByUser).toHaveBeenCalledWith('u1', 20, 40);
    });
  });

  describe('get', () => {
    it('throws NotFoundException when the video does not exist', async () => {
      videosRepo.getById.mockResolvedValue(null);
      await expect(service.get('u1', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('returns the video when found', async () => {
      const video = { id: 'v1' };
      videosRepo.getById.mockResolvedValue(video as never);
      const result = await service.get('u1', 'v1');
      expect(result).toBe(video);
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when the video does not exist', async () => {
      videosRepo.getById.mockResolvedValue(null);
      await expect(service.delete('u1', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('removes clip and video storage objects and deletes the video row', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        storage_path: 'videos/v1.mp4',
        thumbnail_url: 'https://x/storage/v1/object/public/videos/v1_thumb.jpg',
      } as never);
      clipsRepo.listByVideoId.mockResolvedValue([
        {
          id: 'c1',
          storage_path: 'clips/c1.mp4',
          thumbnail_url: null,
          subtitle_url: null,
        },
      ] as never);
      config.get.mockImplementation((key: string) =>
        key === 'buckets.clips' ? 'clips' : key === 'buckets.videos' ? 'videos' : undefined,
      );
      storage.clipThumbPath.mockImplementation((p: string) => `${p}_thumb`);
      storage.parseObjectPathFromUrl.mockReturnValue(null);
      storage.removeObjects.mockResolvedValue(undefined);
      videosRepo.deleteById.mockResolvedValue(true);

      const result = await service.delete('u1', 'v1');

      expect(storage.removeObjects).toHaveBeenCalledWith(
        'clips',
        expect.arrayContaining(['clips/c1.mp4', 'clips/c1.mp4_thumb']),
      );
      expect(storage.removeObjects).toHaveBeenCalledWith(
        'videos',
        expect.arrayContaining(['videos/v1.mp4', 'videos/v1.mp4_thumb']),
      );
      expect(videosRepo.deleteById).toHaveBeenCalledWith('v1', 'u1');
      expect(result).toEqual({ deleted: true, id: 'v1' });
    });

    describe('requireStorageRemoval', () => {
      function arrangeDelete() {
        videosRepo.getById.mockResolvedValue({
          id: 'v1',
          storage_path: 'videos/v1.mp4',
          thumbnail_url: null,
        } as never);
        clipsRepo.listByVideoId.mockResolvedValue([] as never);
        config.get.mockImplementation((key: string) =>
          key === 'buckets.clips' ? 'clips' : key === 'buckets.videos' ? 'videos' : undefined,
        );
        storage.clipThumbPath.mockImplementation((p: string) => `${p}_thumb`);
        storage.parseObjectPathFromUrl.mockReturnValue(null);
        videosRepo.deleteById.mockResolvedValue(true);
      }

      it('keeps the row when Storage rejects the removal', async () => {
        arrangeDelete();
        storage.removeObjects.mockRejectedValue(new Error('storage unavailable'));

        await expect(
          service.delete('u1', 'v1', { requireStorageRemoval: true }),
        ).rejects.toThrow('Storage removal failed for video v1');

        // The row surviving is the point — an orphaned object with no row
        // pointing at it can never be found or cleaned up again.
        expect(videosRepo.deleteById).not.toHaveBeenCalled();
      });

      it('still deletes the row on a Storage failure when not required', async () => {
        arrangeDelete();
        storage.removeObjects.mockRejectedValue(new Error('storage unavailable'));

        // A user clicking delete wants it gone from their dashboard; an
        // already-missing file must not block that.
        await expect(service.delete('u1', 'v1')).resolves.toEqual({ deleted: true, id: 'v1' });
        expect(videosRepo.deleteById).toHaveBeenCalledWith('v1', 'u1');
      });

      it('deletes the row when removal succeeds and it is required', async () => {
        arrangeDelete();
        storage.removeObjects.mockResolvedValue(undefined);

        await expect(
          service.delete('u1', 'v1', { requireStorageRemoval: true }),
        ).resolves.toEqual({ deleted: true, id: 'v1' });
        expect(videosRepo.deleteById).toHaveBeenCalledWith('v1', 'u1');
      });
    });

    it('collects parsed clip thumbnail/subtitle paths, and skips clips with no storage_path', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        storage_path: 'videos/v1.mp4',
        thumbnail_url: null,
      } as never);
      clipsRepo.listByVideoId.mockResolvedValue([
        {
          id: 'c1',
          storage_path: null,
          thumbnail_url: 'stored-clip-thumb',
          subtitle_url: 'stored-clip-subtitle',
        },
      ] as never);
      config.get.mockReturnValue('bucket');
      storage.parseObjectPathFromUrl.mockImplementation(((url: string | null) => {
        if (url === 'stored-clip-thumb') return 'clips/c1_thumb.jpg';
        if (url === 'stored-clip-subtitle') return 'clips/c1.srt';
        return null;
      }) as never);
      storage.removeObjects.mockResolvedValue(undefined);
      videosRepo.deleteById.mockResolvedValue(true);

      await service.delete('u1', 'v1');

      expect(storage.removeObjects).toHaveBeenCalledWith(
        'bucket',
        expect.arrayContaining(['clips/c1_thumb.jpg', 'clips/c1.srt']),
      );
      // storage_path was null for this clip, so its raw path should never
      // have been passed to removeObjects.
      const allRemovedPaths = storage.removeObjects.mock.calls.flatMap(
        (call) => call[1] as string[],
      );
      expect(allRemovedPaths).not.toContain(null);
      expect(allRemovedPaths).not.toContain(undefined);
    });

    it('excludes url-import storage_path values from cleanup', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        storage_path: 'url-import:v1',
        thumbnail_url: null,
      } as never);
      clipsRepo.listByVideoId.mockResolvedValue([]);
      config.get.mockReturnValue('videos');
      storage.parseObjectPathFromUrl.mockReturnValue(null);
      videosRepo.deleteById.mockResolvedValue(true);

      await service.delete('u1', 'v1');

      // No paths at all -> removeObjects should not be called for the video bucket.
      expect(storage.removeObjects).not.toHaveBeenCalled();
    });

    it('adds a parsed thumbnail path when parseObjectPathFromUrl resolves one', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        storage_path: null,
        thumbnail_url: 'https://x/storage/v1/object/public/videos/thumb.jpg',
      } as never);
      clipsRepo.listByVideoId.mockResolvedValue([]);
      config.get.mockReturnValue('videos');
      storage.parseObjectPathFromUrl.mockReturnValue('thumb.jpg');
      storage.removeObjects.mockResolvedValue(undefined);
      videosRepo.deleteById.mockResolvedValue(true);

      await service.delete('u1', 'v1');

      expect(storage.removeObjects).toHaveBeenCalledWith('videos', ['thumb.jpg']);
    });

    it('falls back to default bucket names when config has no bucket configured', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        storage_path: 'videos/v1.mp4',
        thumbnail_url: null,
      } as never);
      clipsRepo.listByVideoId.mockResolvedValue([
        { id: 'c1', storage_path: 'clips/c1.mp4', thumbnail_url: null, subtitle_url: null },
      ] as never);
      config.get.mockReturnValue(undefined);
      delete process.env.STORAGE_BUCKET_VIDEOS;
      storage.clipThumbPath.mockImplementation((p: string) => `${p}_thumb`);
      storage.parseObjectPathFromUrl.mockReturnValue(null);
      storage.removeObjects.mockResolvedValue(undefined);
      videosRepo.deleteById.mockResolvedValue(true);

      await service.delete('u1', 'v1');

      expect(storage.removeObjects).toHaveBeenCalledWith('clips', expect.any(Array));
      expect(storage.removeObjects).toHaveBeenCalledWith('videos', expect.any(Array));
    });

    it('falls back to the STORAGE_BUCKET_VIDEOS env var for the video bucket when unconfigured', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        storage_path: 'videos/v1.mp4',
        thumbnail_url: null,
      } as never);
      clipsRepo.listByVideoId.mockResolvedValue([]);
      config.get.mockReturnValue(undefined);
      process.env.STORAGE_BUCKET_VIDEOS = 'env-videos-bucket';
      storage.parseObjectPathFromUrl.mockReturnValue(null);
      storage.removeObjects.mockResolvedValue(undefined);
      videosRepo.deleteById.mockResolvedValue(true);

      await service.delete('u1', 'v1');

      expect(storage.removeObjects).toHaveBeenCalledWith('env-videos-bucket', expect.any(Array));
      delete process.env.STORAGE_BUCKET_VIDEOS;
    });

    it('swallows storage removal errors and still deletes the video row', async () => {
      videosRepo.getById.mockResolvedValue({
        id: 'v1',
        storage_path: 'videos/v1.mp4',
        thumbnail_url: null,
      } as never);
      clipsRepo.listByVideoId.mockResolvedValue([]);
      config.get.mockReturnValue('videos');
      storage.clipThumbPath.mockReturnValue('videos/v1_thumb.mp4');
      storage.parseObjectPathFromUrl.mockReturnValue(null);
      storage.removeObjects.mockRejectedValue(new Error('storage down'));
      videosRepo.deleteById.mockResolvedValue(true);

      const result = await service.delete('u1', 'v1');
      expect(result).toEqual({ deleted: true, id: 'v1' });
    });
  });
});
