import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobsRepository } from './jobs.repository';
import { CLIP_QUEUE, JobType } from './jobs.constants';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepo: JobsRepository,
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

    try {
      await Promise.race([
        this.clipQueue.add(job.job_type, {
          jobId: row.id,
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

    return row;
  }
}
