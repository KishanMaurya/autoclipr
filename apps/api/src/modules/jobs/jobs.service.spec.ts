import { ServiceUnavailableException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';
import { JobType } from './jobs.constants';

function makeJobsRepo() {
  return {
    enqueue: jest.fn(),
    findById: jest.fn(),
    findLatestByVideo: jest.fn(),
  } as unknown as jest.Mocked<JobsRepository>;
}

function makeMonitoring() {
  return {
    insertDistributedTraceHeaders: jest.fn((headers = {}) => headers),
    recordEvent: jest.fn(),
    logAction: jest.fn(),
  };
}

function makeQueue() {
  return {
    add: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
  };
}

describe('JobsService', () => {
  let jobsRepo: jest.Mocked<JobsRepository>;
  let monitoring: ReturnType<typeof makeMonitoring>;
  let queue: ReturnType<typeof makeQueue>;
  let service: JobsService;

  beforeEach(() => {
    jobsRepo = makeJobsRepo();
    monitoring = makeMonitoring();
    queue = makeQueue();
    service = new JobsService(jobsRepo, monitoring as never, queue as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('enqueueAndDispatch', () => {
    it('persists the job row, adds it to the queue with the right name/payload/options, and records the event', async () => {
      jobsRepo.enqueue.mockResolvedValue({
        id: 'job1',
        scheduled_at: '2024-01-01',
        created_at: '2024-01-01',
      });
      queue.add.mockResolvedValue({ id: 'job1' });

      const row = await service.enqueueAndDispatch({
        user_id: 'u1',
        video_id: 'v1',
        clip_id: 'c1',
        job_type: JobType.GENERATE_CLIPS,
        payload: { hint: 'x' },
      });

      expect(jobsRepo.enqueue).toHaveBeenCalledWith({
        user_id: 'u1',
        video_id: 'v1',
        clip_id: 'c1',
        job_type: JobType.GENERATE_CLIPS,
        payload: { hint: 'x' },
      });
      expect(queue.add).toHaveBeenCalledWith(
        JobType.GENERATE_CLIPS,
        {
          jobId: 'job1',
          userId: 'u1',
          videoId: 'v1',
          clipId: 'c1',
          _nrTrace: {},
          hint: 'x',
        },
        {
          jobId: 'job1',
          removeOnComplete: 200,
          removeOnFail: 100,
        },
      );
      expect(monitoring.recordEvent).toHaveBeenCalledWith('VideoProcessingStarted', {
        userId: 'u1',
        videoId: 'v1',
        jobId: 'job1',
        jobType: JobType.GENERATE_CLIPS,
      });
      expect(row).toEqual({ id: 'job1', scheduled_at: '2024-01-01', created_at: '2024-01-01' });
    });

    it('uses the correct job name/payload for each job type', async () => {
      jobsRepo.enqueue.mockResolvedValue({ id: 'jobX', scheduled_at: 't', created_at: 't' });
      queue.add.mockResolvedValue({ id: 'jobX' });

      for (const jobType of Object.values(JobType)) {
        queue.add.mockClear();
        await service.enqueueAndDispatch({
          user_id: 'u1',
          job_type: jobType,
          payload: {},
        });
        expect(queue.add).toHaveBeenCalledWith(
          jobType,
          expect.objectContaining({ jobId: 'jobX', userId: 'u1' }),
          expect.objectContaining({ jobId: 'jobX' }),
        );
      }
    });

    it('wraps a queue.add rejection in a ServiceUnavailableException and logs the failure', async () => {
      jobsRepo.enqueue.mockResolvedValue({ id: 'job1', scheduled_at: 't', created_at: 't' });
      queue.add.mockRejectedValue(new Error('redis connection refused'));

      await expect(
        service.enqueueAndDispatch({ user_id: 'u1', job_type: JobType.GENERATE_CLIPS, payload: {} }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(monitoring.logAction).toHaveBeenCalledWith(
        'failure',
        'JobsService.enqueueAndDispatch',
        expect.objectContaining({ userId: 'u1', jobType: JobType.GENERATE_CLIPS, errorMessage: 'redis connection refused' }),
      );
      expect(monitoring.recordEvent).not.toHaveBeenCalled();
    });

    it('stringifies a non-Error rejection from queue.add', async () => {
      jobsRepo.enqueue.mockResolvedValue({ id: 'job1', scheduled_at: 't', created_at: 't' });
      queue.add.mockRejectedValue('raw string failure');

      await expect(
        service.enqueueAndDispatch({ user_id: 'u1', job_type: JobType.GENERATE_CLIPS, payload: {} }),
      ).rejects.toThrow('Job queue error: raw string failure. Check REDIS_URL on Railway API.');

      expect(monitoring.logAction).toHaveBeenCalledWith(
        'failure',
        'JobsService.enqueueAndDispatch',
        expect.objectContaining({ errorMessage: 'raw string failure' }),
      );
    });

    it('times out with ServiceUnavailableException when the queue never responds within 15s', async () => {
      jest.useFakeTimers();
      jobsRepo.enqueue.mockResolvedValue({ id: 'job1', scheduled_at: 't', created_at: 't' });
      queue.add.mockReturnValue(new Promise(() => {})); // never resolves

      const promise = service.enqueueAndDispatch({
        user_id: 'u1',
        job_type: JobType.GENERATE_CLIPS,
        payload: {},
      });
      // Attach a rejection handler immediately to avoid unhandled-rejection noise
      // while fake timers advance.
      const assertion = expect(promise).rejects.toThrow(ServiceUnavailableException);

      await jest.advanceTimersByTimeAsync(15_000);
      await assertion;

      expect(monitoring.logAction).toHaveBeenCalledWith(
        'failure',
        'JobsService.enqueueAndDispatch',
        expect.objectContaining({
          errorMessage: expect.stringContaining('Job queue unavailable'),
        }),
      );
    });
  });

  describe('getBullJobState', () => {
    it('returns the job state when found directly by id', async () => {
      queue.getJob.mockResolvedValue({ getState: jest.fn().mockResolvedValue('active') });

      const state = await service.getBullJobState('job1');

      expect(queue.getJob).toHaveBeenCalledWith('job1');
      expect(state).toBe('active');
    });

    it('falls back to scanning waiting/delayed/active jobs when getJob returns nothing', async () => {
      queue.getJob.mockResolvedValue(null);
      queue.getJobs.mockResolvedValue([
        { data: { jobId: 'other' } },
        { data: { jobId: 'job1' }, getState: jest.fn().mockResolvedValue('waiting') },
      ]);

      const state = await service.getBullJobState('job1');

      expect(queue.getJobs).toHaveBeenCalledWith(['waiting', 'delayed', 'active']);
      expect(state).toBe('waiting');
    });

    it('returns "missing" when the job cannot be found anywhere', async () => {
      queue.getJob.mockResolvedValue(null);
      queue.getJobs.mockResolvedValue([]);

      const state = await service.getBullJobState('job1');

      expect(state).toBe('missing');
    });

    it('returns null when the queue throws', async () => {
      queue.getJob.mockRejectedValue(new Error('redis down'));

      const state = await service.getBullJobState('job1');

      expect(state).toBeNull();
    });
  });

  describe('redispatchQueuedJob', () => {
    it('re-adds a queued job to the queue with its original payload', async () => {
      jobsRepo.findById.mockResolvedValue({
        id: 'job1',
        user_id: 'u1',
        video_id: 'v1',
        clip_id: null,
        job_type: 'generate_clips',
        status: 'queued',
        payload: { hint: 'y' },
        result: null,
        error_message: null,
        created_at: 't',
        completed_at: null,
      });

      await service.redispatchQueuedJob('job1');

      expect(queue.add).toHaveBeenCalledWith(
        'generate_clips',
        {
          jobId: 'job1',
          userId: 'u1',
          videoId: 'v1',
          clipId: null,
          _nrTrace: {},
          hint: 'y',
        },
        {
          jobId: 'job1',
          removeOnComplete: 200,
          removeOnFail: 100,
        },
      );
    });

    it('handles a job with a null payload', async () => {
      jobsRepo.findById.mockResolvedValue({
        id: 'job1',
        user_id: 'u1',
        video_id: null,
        clip_id: null,
        job_type: 'export_clip',
        status: 'queued',
        payload: null as never,
        result: null,
        error_message: null,
        created_at: 't',
        completed_at: null,
      });

      await service.redispatchQueuedJob('job1');

      expect(queue.add).toHaveBeenCalledWith(
        'export_clip',
        expect.objectContaining({ jobId: 'job1' }),
        expect.anything(),
      );
    });

    it('throws ServiceUnavailableException when the job does not exist', async () => {
      jobsRepo.findById.mockResolvedValue(null);
      await expect(service.redispatchQueuedJob('missing')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when the job is not in "queued" status', async () => {
      jobsRepo.findById.mockResolvedValue({
        id: 'job1',
        user_id: 'u1',
        video_id: null,
        clip_id: null,
        job_type: 'generate_clips',
        status: 'completed',
        payload: {},
        result: null,
        error_message: null,
        created_at: 't',
        completed_at: 't',
      });

      await expect(service.redispatchQueuedJob('job1')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(queue.add).not.toHaveBeenCalled();
    });
  });
});
