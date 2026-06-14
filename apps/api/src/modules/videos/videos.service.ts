import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonitoringService, NR_EVENTS } from '@autoclipr/monitoring';
import { JobsService } from '../jobs/jobs.service';
import { JobsRepository } from '../jobs/jobs.repository';
import { JobType } from '../jobs/jobs.constants';
import { UsersRepository } from '../users/users.repository';
import { StorageService } from '../storage/storage.service';
import { VideosRepository } from './videos.repository';
import { InitUploadDto } from './dto/init-upload.dto';
import { ImportUrlDto } from './dto/import-url.dto';
import { getSourceLabel, parseVideoUrl } from './utils/video-url.util';

@Injectable()
export class VideosService {
  constructor(
    private readonly videosRepo: VideosRepository,
    private readonly storage: StorageService,
    private readonly jobsService: JobsService,
    private readonly jobsRepo: JobsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly monitoring: MonitoringService,
    private readonly config: ConfigService,
  ) {}

  async initUpload(userId: string, dto: InitUploadDto) {
    const bucket =
      this.config.get<string>('buckets.videos') ??
      process.env.STORAGE_BUCKET_VIDEOS ??
      'videos';
    const storagePath = this.storage.createUploadPath(userId, dto.filename);
    const signed = await this.storage.createSignedUploadUrl(storagePath, bucket);

    const video = await this.videosRepo.create({
      user_id: userId,
      title: dto.title,
      storage_path: storagePath,
      status: 'uploading',
      mime_type: dto.mime_type,
      file_size_bytes: dto.size,
      source_type: 'upload',
    });

    const profile = await this.usersRepo.getById(userId);
    this.monitoring.recordEvent(NR_EVENTS.VIDEO_UPLOAD_STARTED, {
      userId,
      videoId: video.id,
      fileSize: dto.size,
      plan: profile?.subscription_tier ?? 'free',
    });

    return {
      video_id: video.id,
      upload_url: signed.signedUrl,
      storage_path: storagePath,
    };
  }

  async importFromUrl(userId: string, dto: ImportUrlDto) {
    const parsed = parseVideoUrl(dto.url);
    if (!parsed.isSupported) {
      throw new BadRequestException(
        'Unsupported URL. Use YouTube, Vimeo, Loom, Google Drive, or a direct MP4 link.',
      );
    }

    const clipCount = dto.clip_count ?? 10;
    const costPerClip = this.config.get<number>('clipCreditCost') ?? 1;
    const totalCost = costPerClip * clipCount;

    const profile = await this.usersRepo.getById(userId);
    const balance = profile?.credits ?? 0;
    if (balance < totalCost) {
      throw new BadRequestException(
        `Not enough credits: need ${totalCost} (${clipCount} clips × ${costPerClip} credits). You have ${balance}. Reduce clip count or upgrade your plan.`,
      );
    }

    try {
      await this.usersRepo.deductCredits(
        userId,
        totalCost,
        'url_import_pipeline',
        undefined,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('insufficient credits')) {
        throw new BadRequestException(
          `Not enough credits: need ${totalCost} (${clipCount} clips × ${costPerClip} credits). You have ${balance}.`,
        );
      }
      throw err;
    }

    const title =
      dto.title?.trim() ||
      `${getSourceLabel(parsed.sourceType)} import · ${new Date().toLocaleDateString()}`;

    const video = await this.videosRepo.create({
      user_id: userId,
      title,
      storage_path: 'url-import:pending',
      status: 'importing',
      source_url: parsed.normalizedUrl,
      source_type: parsed.sourceType,
      mime_type: 'video/mp4',
    });

    await this.videosRepo.updateStoragePath(video.id, `url-import:${video.id}`);

    const job = await this.jobsService.enqueueAndDispatch({
      user_id: userId,
      video_id: video.id,
      job_type: JobType.URL_PIPELINE,
      payload: {
        video_id: video.id,
        source_url: parsed.normalizedUrl,
        source_type: parsed.sourceType,
        clip_count: clipCount,
        durations: dto.durations ?? [15, 30, 45, 60],
        caption_style: dto.caption_style ?? 'viral',
        caption_language: dto.caption_language ?? 'en',
        platforms: dto.platforms ?? ['tiktok', 'instagram', 'youtube', 'linkedin'],
        export_quality: dto.export_quality ?? 'hd',
        auto_publish: dto.auto_publish ?? false,
        credit_cost: totalCost,
      },
    });

    return {
      video_id: video.id,
      job_id: job.id,
      source_type: parsed.sourceType,
      source_label: parsed.displayName,
      title: video.title,
      status: 'importing',
    };
  }

  async getPipeline(userId: string, videoId: string) {
    const video = await this.videosRepo.getById(videoId, userId);
    if (!video) throw new NotFoundException('Video not found');

    const job = await this.jobsRepo.findLatestByVideo(videoId);
    const result = (job?.result ?? {}) as Record<string, unknown>;
    const steps = (result.steps as Array<Record<string, unknown>>) ?? [];

    return {
      video_id: video.id,
      title: video.title,
      status: video.status,
      source_url: video.source_url,
      source_type: video.source_type,
      analysis: video.analysis ?? result.analysis ?? null,
      job: job
        ? {
            id: job.id,
            type: job.job_type,
            status: job.status,
            error: job.error_message,
          }
        : null,
      current_step: result.current_step ?? null,
      steps,
      clips_created: result.clips_created ?? 0,
      progress_percent: result.progress_percent ?? 0,
      error_message: job?.error_message ?? null,
    };
  }

  async completeUpload(userId: string, videoId: string) {
    const video = await this.videosRepo.getById(videoId, userId);
    if (!video) throw new NotFoundException('Video not found');

    await this.videosRepo.updateStatus(videoId, 'processing');

    await this.jobsService.enqueueAndDispatch({
      user_id: userId,
      video_id: videoId,
      job_type: JobType.ANALYZE_VIDEO,
      payload: { video_id: videoId },
    });

    return { status: 'processing' };
  }

  async list(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    return this.videosRepo.listByUser(userId, limit, offset);
  }

  async get(userId: string, videoId: string) {
    const video = await this.videosRepo.getById(videoId, userId);
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }
}
