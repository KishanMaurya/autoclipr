import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MonitoringService,
  NR_EVENTS,
  type DistributedTraceHeaders,
} from '@autoclipr/monitoring';
import { JobsRepository } from './jobs.repository';
import { CLIP_QUEUE, JobType } from './jobs.constants';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepo: JobsRepository,
    private readonly monitoring: MonitoringService,
    @InjectQueue(CLIP_QUEUE) private readonly clipQueue: Queue,
  ) {}

  async enqueueAndDispatch(job: {
    user_id: string;
    video_id?: string;
    clip_id?: string;
    job_type: JobType;
    payload: Record<string, unknown>;
  }) {
    const row = await this.jobsRepo.enqueue({
      user_id: job.user_id,
      video_id: job.video_id,
      clip_id: job.clip_id,
      job_type: job.job_type,
      payload: job.payload,
    });

    const traceHeaders: DistributedTraceHeaders = {};
    this.monitoring.insertDistributedTraceHeaders(traceHeaders);

    try {
      await Promise.race([
        this.clipQueue.add(
          job.job_type,
          {
            jobId: row.id,
            userId: job.user_id,
            videoId: job.video_id,
            clipId: job.clip_id,
            _nrTrace: traceHeaders,
            ...job.payload,
          },
          {
            jobId: row.id,
            removeOnComplete: 200,
            removeOnFail: 100,
          },
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new ServiceUnavailableException(
                  'Job queue unavailable — set REDIS_URL=${{Redis.REDIS_URL}} on the Railway API service.',
                ),
              ),
            15_000,
          ),
        ),
      ]);
    } catch (err) {
      if (err instanceof ServiceUnavailableException) {
        this.monitoring.logAction('failure', 'JobsService.enqueueAndDispatch', {
          userId: job.user_id,
          videoId: job.video_id,
          jobType: job.job_type,
          errorMessage: err.message,
        });
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.monitoring.logAction('failure', 'JobsService.enqueueAndDispatch', {
        userId: job.user_id,
        videoId: job.video_id,
        jobType: job.job_type,
        errorMessage: message,
      });
      throw new ServiceUnavailableException(
        `Job queue error: ${message}. Check REDIS_URL on Railway API.`,
      );
    }

    this.monitoring.recordEvent(NR_EVENTS.VIDEO_PROCESSING_STARTED, {
      userId: job.user_id,
      videoId: job.video_id,
      jobId: row.id,
      jobType: job.job_type,
    });

    return row;
  }

  /** BullMQ state for a DB job id — helps diagnose stuck `queued` jobs. */
  async getBullJobState(dbJobId: string): Promise<string | null> {
    try {
      let job: Awaited<ReturnType<Queue['getJob']>> = await this.clipQueue.getJob(dbJobId);
      if (!job) {
        const active = await this.clipQueue.getJobs(['waiting', 'delayed', 'active']);
        job = active.find((j) => j.data?.jobId === dbJobId);
      }
      if (!job) return 'missing';
      return await job.getState();
    } catch {
      return null;
    }
  }

  /** Re-enqueue a DB job that is still queued but missing from Redis. */
  async redispatchQueuedJob(dbJobId: string): Promise<void> {
    const row = await this.jobsRepo.findById(dbJobId);
    if (!row || row.status !== 'queued') {
      throw new ServiceUnavailableException('Job is not eligible for redispatch');
    }

    const traceHeaders: DistributedTraceHeaders = {};
    this.monitoring.insertDistributedTraceHeaders(traceHeaders);

    await this.clipQueue.add(
      row.job_type,
      {
        jobId: row.id,
        userId: row.user_id,
        videoId: row.video_id,
        clipId: row.clip_id,
        _nrTrace: traceHeaders,
        ...(row.payload ?? {}),
      },
      {
        jobId: row.id,
        removeOnComplete: 200,
        removeOnFail: 100,
      },
    );
  }
}
