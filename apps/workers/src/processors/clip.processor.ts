import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { formatForLog } from '../common/log-sanitize.util';
import { DatabaseService } from '../database/database.service';
import { CLIP_QUEUE } from '../jobs.constants';
import { UrlPipelineService } from '../pipeline/url-pipeline.service';
import { PublishService } from '../publish/publish.service';
import { YoutubePublisherService } from '../publish/youtube-publisher.service';
import type { UrlPipelinePayload } from '../pipeline/types';

@Processor(CLIP_QUEUE)
export class ClipProcessor extends WorkerHost {
  private readonly logger = new Logger(ClipProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly urlPipeline: UrlPipelineService,
    private readonly publishService: PublishService,
  ) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `QUEUE active bullId=${job.id} name=${job.name} attempts=${job.attemptsMade + 1}\n${formatForLog(job.data)}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    const ms = job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : 0;
    this.logger.log(`QUEUE completed bullId=${job.id} name=${job.name} ${ms}ms`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    const id = job?.id ?? 'unknown';
    const name = job?.name ?? 'unknown';
    this.logger.error(`QUEUE failed bullId=${id} name=${name} — ${err.message}`);
  }

  async process(job: Job): Promise<void> {
    const jobId = job.data.jobId as string | undefined;
    const name = job.name;
    const started = Date.now();

    this.logger.log(
      `JOB start name=${name} jobId=${jobId ?? '-'} bullId=${job.id}\n${formatForLog(job.data)}`,
    );

    try {
      if (jobId) {
        await this.db.client.query(
          `UPDATE processing_jobs SET status = 'processing', started_at = NOW(), attempts = attempts + 1 WHERE id = $1`,
          [jobId],
        );
      }

      let result: unknown;

      switch (name) {
        case 'url_pipeline':
          await this.urlPipeline.run(job.data as UrlPipelinePayload, jobId);
          result = { status: 'completed', video_id: job.data.video_id };
          break;
        case 'generate_clips':
          await this.handleGenerateClips(job.data, jobId);
          result = { status: 'completed', video_id: job.data.video_id };
          break;
        case 'export_clip':
          await this.handleExport(jobId);
          result = { status: 'completed', job_id: jobId };
          break;
        case 'analyze_video':
          await this.handleAnalyze(job.data, jobId);
          result = { status: 'completed', video_id: job.data.video_id };
          break;
        case 'publish_clip':
          await this.publishService.run(job.data as Record<string, unknown>, jobId);
          result = { status: 'completed', clip_id: job.data.clip_id };
          break;
        default:
          this.logger.warn(`Unknown job type: ${name}`);
          result = { status: 'ignored', name };
      }

      this.logger.log(
        `JOB done name=${name} jobId=${jobId ?? '-'} bullId=${job.id} ${Date.now() - started}ms\n${formatForLog(result)}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `JOB failed name=${name} jobId=${jobId ?? '-'} bullId=${job.id} ${Date.now() - started}ms — ${message}`,
      );

      if (jobId) {
        await this.db.client.query(
          `UPDATE processing_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
          [message, jobId],
        );
      }
      const videoId = job.data.video_id as string | undefined;
      if (videoId) {
        await this.db.client.query(`UPDATE videos SET status = 'failed' WHERE id = $1`, [videoId]);
      }
      throw err;
    }
  }

  private async handleGenerateClips(data: Record<string, unknown>, jobId?: string) {
    const videoId = data.video_id as string;
    const clipCount = (data.clip_count as number) ?? 3;
    const durations = (data.durations as number[]) ?? [30, 45, 60];
    const captionStyle = (data.caption_style as string) ?? 'viral';
    const captionLanguage = (data.caption_language as string) ?? 'en';
    const platforms = (data.platforms as string[]) ?? ['tiktok', 'instagram', 'youtube'];
    const exportQuality = (data.export_quality as string) ?? 'hd';

    const userRes = await this.db.client.query(
      `SELECT user_id, storage_path, duration_seconds FROM videos WHERE id = $1`,
      [videoId],
    );
    const row = userRes.rows[0];
    const userId = row?.user_id;
    if (!userId || !row?.storage_path) {
      throw new Error('Video not found or missing storage_path — upload must complete first');
    }

    await this.urlPipeline.run(
      {
        video_id: videoId,
        source_url: `storage://${row.storage_path}`,
        clip_count: clipCount,
        durations,
        caption_style: captionStyle,
        caption_language: captionLanguage,
        platforms,
        export_quality: exportQuality,
      },
      jobId,
    );
  }

  private async handleExport(jobId?: string) {
    if (jobId) {
      await this.db.client.query(
        `UPDATE processing_jobs SET status = 'completed', result = $1::jsonb, completed_at = NOW() WHERE id = $2`,
        [
          JSON.stringify({
            export_url: null,
            resolution: '1080x1920',
            quality: 'hd',
            message: 'Clip already exported during url_pipeline',
          }),
          jobId,
        ],
      );
    }
  }

  private async handleAnalyze(data: Record<string, unknown>, jobId?: string) {
    const videoId = data.video_id as string;
    await this.db.client.query(`UPDATE videos SET status = 'processing' WHERE id = $1`, [videoId]);

    const videoRes = await this.db.client.query(
      `SELECT user_id, storage_path, source_url, duration_seconds FROM videos WHERE id = $1`,
      [videoId],
    );
    const v = videoRes.rows[0];
    if (!v?.storage_path) {
      throw new Error('Video file not available for analysis');
    }

    await this.urlPipeline.run(
      {
        video_id: videoId,
        source_url: v.source_url ?? `storage://${v.storage_path}`,
        clip_count: 5,
        durations: [30, 45, 60],
      },
      jobId,
    );
  }
}
