import { Injectable, Logger } from '@nestjs/common';
import { MonitoringService, NR_EVENTS } from '@autoclipr/monitoring';
import { PipelineLogger } from '../common/pipeline-logger.util';
import { DatabaseService } from '../database/database.service';
import { CaptionService } from './caption.service';
import { FfmpegService } from './ffmpeg.service';
import { HookAnalysisService } from './hook-analysis.service';
import { TempFilesService } from './temp-files.service';
import type { PipelineStep, UrlPipelinePayload, ViralMoment } from './types';
import { WorkersStorageService } from './storage.service';
import { WhisperService } from './whisper.service';
import { YtdlpService } from './ytdlp.service';

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram Reels',
  youtube: 'YouTube Shorts',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
};

@Injectable()
export class UrlPipelineService {
  private readonly logger = new Logger(UrlPipelineService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly temp: TempFilesService,
    private readonly ytdlp: YtdlpService,
    private readonly ffmpeg: FfmpegService,
    private readonly whisper: WhisperService,
    private readonly hooks: HookAnalysisService,
    private readonly captions: CaptionService,
    private readonly storage: WorkersStorageService,
    private readonly monitoring: MonitoringService,
  ) {}

  async run(data: UrlPipelinePayload, jobId?: string): Promise<void> {
    const videoId = data.video_id;
    const sourceUrl = data.source_url;
    const clipCount = data.clip_count ?? 10;
    const durations = data.durations ?? [15, 30, 45, 60];
    const captionStyle = data.caption_style ?? 'viral';
    const captionLanguage = data.caption_language ?? 'en';
    const platforms = data.platforms ?? ['tiktok', 'instagram', 'youtube', 'linkedin'];
    const exportQuality = data.export_quality ?? 'hd';

    const userRes = await this.db.client.query(
      `SELECT user_id, title, storage_path, source_url FROM videos WHERE id = $1`,
      [videoId],
    );
    const videoRow = userRes.rows[0];
    const userId = videoRow?.user_id as string | undefined;
    const existingStoragePath = videoRow?.storage_path as string | undefined;
    if (!userId) throw new Error('Video not found');

    const plog = new PipelineLogger(this.logger, videoId, jobId);
    const pipelineStarted = Date.now();
    plog.stepStart('pipeline', {
      source_url: sourceUrl,
      clip_count: clipCount,
      export_quality: exportQuality,
    });

    const isRemoteUrl = /^https?:\/\//i.test(sourceUrl);

    const workDir = await this.temp.createJobDir(videoId);
    const sourceVideoPath = this.temp.jobPath(workDir, 'source.mp4');
    const audioPath = this.temp.jobPath(workDir, 'audio.mp3');
    const thumbPath = this.temp.jobPath(workDir, 'thumb.jpg');

    const steps: PipelineStep[] = [
      { id: 'download', label: 'Download video', status: 'pending' },
      {
        id: 'analyze',
        label: 'AI analysis',
        status: 'pending',
        checks: [
          'Extract audio',
          'Generate transcript',
          'Detect speakers',
          'Identify viral moments',
          'Detect hooks',
          'Analyze engagement patterns',
          'Detect scene changes',
        ],
      },
      { id: 'clips', label: 'Generate shorts', status: 'pending' },
      { id: 'captions', label: 'AI captions', status: 'pending' },
      { id: 'export', label: 'Export & publish', status: 'pending' },
    ];

    try {
      // ── Step 1: yt-dlp download ─────────────────────────────────────
      const downloadStarted = Date.now();
      plog.stepStart('download', { remote: isRemoteUrl });
      steps[0].status = 'active';
      await this.updateProgress(jobId, 5, 1, steps);
      await this.db.client.query(`UPDATE videos SET status = 'importing' WHERE id = $1`, [
        videoId,
      ]);

      let meta: { title?: string } = {};
      let videoStoragePath = existingStoragePath ?? '';

      if (isRemoteUrl) {
        meta = await this.ytdlp.download(sourceUrl, sourceVideoPath);
        // Source stays on worker disk only — Supabase free tier allows 50 MB per file.
        videoStoragePath = this.storage.urlImportPath(videoId);
        this.logger.log(
          `Skipping source upload (${this.storage.formatBytes(await this.storage.getLocalFileSize(sourceVideoPath))} local). ` +
            `Clips only are stored in Supabase.`,
        );
      } else {
        if (!existingStoragePath || this.storage.isUrlImportPath(existingStoragePath)) {
          throw new Error('Video has no storage_path — upload the file first');
        }
        this.logger.log(`Loading from Supabase storage: ${existingStoragePath}`);
        await this.storage.downloadToFile(
          this.storage.bucketVideos(),
          existingStoragePath,
          sourceVideoPath,
        );
        videoStoragePath = existingStoragePath;
      }

      const durationSeconds = await this.ffmpeg.getDurationSeconds(sourceVideoPath);

      await this.ffmpeg.extractThumbnail(sourceVideoPath, thumbPath, 2);
      let thumbUrl: string | null = null;
      try {
        const thumbStoragePath = this.storage.objectPath(
          userId,
          'thumbs',
          `${videoId}.jpg`,
        );
        await this.storage.uploadLocalFile(
          this.storage.bucketVideos(),
          thumbStoragePath,
          thumbPath,
          'image/jpeg',
        );
        thumbUrl = this.storage.getPublicUrl(this.storage.bucketVideos(), thumbStoragePath);
      } catch (err) {
        this.logger.warn(`Thumbnail upload skipped: ${err}`);
      }

      await this.db.client.query(
        `UPDATE videos SET storage_path = $1, duration_seconds = $2, status = 'processing',
         thumbnail_url = $3, title = COALESCE(NULLIF($4, ''), title) WHERE id = $5`,
        [
          videoStoragePath,
          durationSeconds,
          thumbUrl,
          meta.title ?? null,
          videoId,
        ],
      );

      steps[0].status = 'completed';
      plog.stepDone('download', Date.now() - downloadStarted, {
        duration_seconds: durationSeconds,
        title: meta.title,
      });
      await this.updateProgress(jobId, 20, 1, steps);

      // ── Step 2: FFmpeg audio + Whisper + GPT hooks ──────────────────
      const analyzeStarted = Date.now();
      plog.stepStart('analyze');
      steps[1].status = 'active';
      await this.updateProgress(jobId, 25, 2, steps);
      await this.db.client.query(`UPDATE videos SET status = 'analyzing' WHERE id = $1`, [
        videoId,
      ]);

      await this.ffmpeg.extractAudio(sourceVideoPath, audioPath);
      const transcript = await this.whisper.transcribe(audioPath, captionLanguage, {
        durationSeconds,
      });

      const hookStarted = Date.now();
      const moments = await this.hooks.identifyMoments(
        transcript,
        durationSeconds,
        clipCount,
        durations,
      );

      this.monitoring.recordEvent(NR_EVENTS.HOOK_GENERATED, {
        userId,
        videoId,
        provider: this.hooks.getProviderLabel(),
        latency: Date.now() - hookStarted,
        tokens: moments.length,
      });

      const analysis = {
        source_url: sourceUrl,
        transcript_ready: !transcript.fallback,
        transcript_fallback: transcript.fallback ?? false,
        transcript_warning: transcript.fallback_reason ?? null,
        hook_analysis_provider: this.hooks.getProviderLabel(),
        transcript_preview: transcript.text.slice(0, 500),
        language: transcript.language ?? captionLanguage,
        speakers_detected: this.estimateSpeakers(transcript.text),
        viral_moments: moments.length,
        hooks_found: moments.filter((m) => m.hook_text.length > 10).length,
        scene_changes: Math.max(1, Math.floor(durationSeconds / 12)),
        engagement_score: this.avgScore(moments) / 100,
        segments_count: transcript.segments.length,
      };

      await this.db.client.query(
        `UPDATE videos SET analysis = $1::jsonb WHERE id = $2`,
        [JSON.stringify(analysis), videoId],
      );

      steps[1].status = 'completed';
      plog.stepDone('analyze', Date.now() - analyzeStarted, {
        segments: transcript.segments.length,
        moments: moments.length,
        transcript_fallback: transcript.fallback ?? false,
        hook_provider: this.hooks.getProviderLabel(),
      });
      await this.updateProgress(jobId, 45, 2, steps, analysis);

      // ── Step 3–5: Cut clips, burn captions, upload ───────────────────
      const clipsStarted = Date.now();
      plog.stepStart('clips', { count: moments.length });
      steps[2].status = 'active';
      await this.updateProgress(jobId, 50, 3, steps, analysis);

      const clipIds: string[] = [];
      for (let i = 0; i < moments.length; i++) {
        const moment = moments[i];
        const clipId = await this.renderAndUploadClip({
          workDir,
          userId,
          videoId,
          index: i,
          moment,
          sourceVideoPath,
          transcript: transcript.segments,
          captionStyle,
          captionLanguage,
          platforms,
          exportQuality,
        });
        clipIds.push(clipId);

        const pct = 50 + Math.floor(((i + 1) / moments.length) * 40);
        await this.updateProgress(jobId, pct, 3, steps, analysis, i + 1);
      }

      steps[2].status = 'completed';
      steps[3].status = 'completed';
      steps[4].status = 'active';
      plog.stepDone('clips', Date.now() - clipsStarted, { clip_ids: clipIds });
      await this.updateProgress(jobId, 95, 5, steps, analysis, moments.length);

      steps[4].status = 'completed';
      await this.db.client.query(`UPDATE videos SET status = 'ready' WHERE id = $1`, [videoId]);
      plog.stepDone('pipeline', Date.now() - pipelineStarted, {
        clips_created: moments.length,
        status: 'ready',
      });

      this.monitoring.recordEvent(NR_EVENTS.VIDEO_PROCESSING_COMPLETED, {
        userId,
        videoId,
        jobId,
        processingTime: Date.now() - pipelineStarted,
        duration: durationSeconds,
        clipsCreated: moments.length,
      });

      const platformLabels = platforms.map((p) => PLATFORM_LABELS[p] ?? p);
      const finalResult = {
        current_step: 5,
        progress_percent: 100,
        steps,
        analysis: {
          ...analysis,
          caption_style: captionStyle,
          caption_language: captionLanguage,
          platforms: platformLabels,
          export_resolution: exportQuality === '4k' ? '2160x3840' : '1080x1920',
          export_quality: exportQuality,
          clip_ids: clipIds,
        },
        clips_created: moments.length,
        auto_publish: data.auto_publish ?? false,
        publish_targets: platformLabels,
      };

      if (jobId) {
        await this.db.client.query(
          `UPDATE processing_jobs SET status = 'completed', result = $1::jsonb, completed_at = NOW() WHERE id = $2`,
          [JSON.stringify(finalResult), jobId],
        );
      }
    } catch (err) {
      plog.stepFail('pipeline', 0, err);
      await this.markPipelineFailed(jobId, steps, err);
      throw err;
    } finally {
      await this.temp.cleanup(workDir);
    }
  }

  private async markPipelineFailed(
    jobId: string | undefined,
    steps: PipelineStep[],
    err: unknown,
  ) {
    const activeIdx = steps.findIndex((s) => s.status === 'active');
    if (activeIdx >= 0) {
      steps[activeIdx].status = 'failed';
    }
    if (!jobId) return;

    const message = err instanceof Error ? err.message : 'Unknown error';
    await this.db.client.query(
      `UPDATE processing_jobs SET result = $1::jsonb WHERE id = $2`,
      [
        JSON.stringify({
          current_step: activeIdx >= 0 ? activeIdx + 1 : null,
          progress_percent: 0,
          steps,
          error_message: message,
          failed_step: activeIdx >= 0 ? steps[activeIdx].id : null,
        }),
        jobId,
      ],
    );
  }

  private async renderAndUploadClip(opts: {
    workDir: string;
    userId: string;
    videoId: string;
    index: number;
    moment: ViralMoment;
    sourceVideoPath: string;
    transcript: import('./types').TranscriptSegment[];
    captionStyle: string;
    captionLanguage: string;
    platforms: string[];
    exportQuality: string;
  }): Promise<string> {
    const {
      workDir,
      userId,
      videoId,
      index,
      moment,
      sourceVideoPath,
      transcript,
      captionStyle,
      captionLanguage,
      platforms,
      exportQuality,
    } = opts;

    const rawClip = this.temp.jobPath(workDir, `clip_${index}_raw.mp4`);
    const captionedClip = this.temp.jobPath(workDir, `clip_${index}_final.mp4`);
    const srtPath = this.temp.jobPath(workDir, `clip_${index}.srt`);
    const clipThumb = this.temp.jobPath(workDir, `clip_${index}_thumb.jpg`);

    await this.ffmpeg.cutClip(
      sourceVideoPath,
      rawClip,
      moment.start_ms,
      moment.end_ms,
      exportQuality,
    );

    await this.captions.writeClipSrt(
      transcript,
      moment.start_ms,
      moment.end_ms,
      srtPath,
      captionStyle,
    );

    await this.ffmpeg.burnCaptions(rawClip, srtPath, captionedClip, captionStyle);

    const durationSec = Math.round((moment.end_ms - moment.start_ms) / 1000);

    let hasThumb = false;
    try {
      await this.ffmpeg.extractThumbnail(
        captionedClip,
        clipThumb,
        Math.min(2, durationSec / 2),
      );
      hasThumb = true;
    } catch {
      // optional
    }

    const insertRes = await this.db.client.query(
      `INSERT INTO clips (
         user_id, video_id, title, start_time_ms, end_time_ms, status, aspect_ratio,
         ai_score, viral_score, duration_seconds, caption_style, caption_language,
         platform_targets, export_quality, viral_metrics
       )
       VALUES ($1, $2, $3, $4, $5, 'processing', '9:16', $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
       RETURNING id`,
      [
        userId,
        videoId,
        moment.title,
        moment.start_ms,
        moment.end_ms,
        moment.viral_score / 100,
        moment.viral_score,
        durationSec,
        captionStyle,
        captionLanguage,
        platforms,
        exportQuality,
        JSON.stringify(moment.metrics),
      ],
    );

    const clipId = insertRes.rows[0].id as string;
    const clipStoragePath = this.storage.objectPath(userId, videoId, `${clipId}.mp4`);
    const srtStoragePath = this.storage.objectPath(userId, videoId, `${clipId}.srt`);

    await this.storage.uploadLocalFile(
      this.storage.bucketClips(),
      clipStoragePath,
      captionedClip,
      'video/mp4',
      { label: `clip ${index + 1}` },
    );

    let subtitleUrl: string | null = null;
    try {
      await this.storage.uploadLocalFile(
        this.storage.bucketClips(),
        srtStoragePath,
        srtPath,
        'text/plain',
      );
      subtitleUrl = this.storage.getPublicUrl(this.storage.bucketClips(), srtStoragePath);
    } catch {
      subtitleUrl = srtStoragePath;
    }

    let clipThumbUrl: string | null = null;
    const thumbStoragePath = this.storage.objectPath(userId, videoId, `${clipId}_thumb.jpg`);
    if (hasThumb) {
      try {
        await this.storage.uploadLocalFile(
          this.storage.bucketClips(),
          thumbStoragePath,
          clipThumb,
          'image/jpeg',
        );
        clipThumbUrl = this.storage.getPublicUrl(this.storage.bucketClips(), thumbStoragePath);
      } catch {
        clipThumbUrl = null;
      }
    }


    await this.db.client.query(
      `UPDATE clips SET storage_path = $1, thumbnail_url = $2, subtitle_url = $3, status = 'completed' WHERE id = $4`,
      [clipStoragePath, clipThumbUrl, subtitleUrl, clipId],
    );

    return clipId;
  }

  private async updateProgress(
    jobId: string | undefined,
    progress_percent: number,
    current_step: number,
    steps: PipelineStep[],
    analysis?: Record<string, unknown>,
    clips_created?: number,
  ) {
    if (!jobId) return;
    await this.db.client.query(
      `UPDATE processing_jobs SET result = $1::jsonb WHERE id = $2`,
      [
        JSON.stringify({
          current_step,
          progress_percent,
          steps,
          analysis,
          clips_created,
        }),
        jobId,
      ],
    );
  }

  private estimateSpeakers(text: string): number {
    const matches = text.match(/\b(Speaker \d|Host:|Guest:)/gi);
    return matches ? Math.min(4, new Set(matches.map((m) => m.toLowerCase())).size) : 1;
  }

  private avgScore(moments: ViralMoment[]): number {
    if (!moments.length) return 80;
    return Math.round(
      moments.reduce((a, m) => a + m.viral_score, 0) / moments.length,
    );
  }
}
