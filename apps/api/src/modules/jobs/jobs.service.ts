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
        this.clipQueue.add(job.job_type, {
          jobId: row.id,
          userId: job.user_id,
          videoId: job.video_id,
          clipId: job.clip_id,
          _nrTrace: traceHeaders,
          ...job.payload,
        }),
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
      if (err instanceof ServiceUnavailableException) throw err;
      const message = err instanceof Error ? err.message : String(err);
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
}
