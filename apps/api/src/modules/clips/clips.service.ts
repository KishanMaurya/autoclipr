import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../jobs/jobs.service';
import { JobType } from '../jobs/jobs.constants';
import { StorageService } from '../storage/storage.service';
import { PlatformsRepository } from '../platforms/platforms.repository';
import type { PlatformId } from '../platforms/dto/platform.dto';
import { UsersRepository } from '../users/users.repository';
import { VideosRepository } from '../videos/videos.repository';
import { ClipsRepository, type Clip } from './clips.repository';
import { PublicationsRepository, type ClipPublication } from './publications.repository';
import { GenerateClipsDto } from './dto/generate-clips.dto';
import type { PublishClipDto } from '../platforms/dto/platform.dto';

export type EnrichedClip = Clip & {
  download_url?: string | null;
  thumbnail_url?: string | null;
  publications?: ClipPublication[];
};

@Injectable()
export class ClipsService {
  constructor(
    private readonly clipsRepo: ClipsRepository,
    private readonly publicationsRepo: PublicationsRepository,
    private readonly platformsRepo: PlatformsRepository,
    private readonly videosRepo: VideosRepository,
    private readonly usersRepo: UsersRepository,
    private readonly jobsService: JobsService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  private clipsBucket(): string {
    return this.config.get<string>('buckets.clips') ?? 'clips';
  }

  private async resolveThumbnailUrl(clip: Clip): Promise<string | null> {
    const bucket = this.clipsBucket();
    const candidates = new Set<string>();

    if (clip.storage_path) {
      candidates.add(this.storage.clipThumbPath(clip.storage_path));
    }

    const fromStoredUrl = this.storage.parseObjectPathFromUrl(
      clip.thumbnail_url,
      bucket,
    );
    if (fromStoredUrl) {
      if (/\.mp4$/i.test(fromStoredUrl)) {
        candidates.add(this.storage.clipThumbPath(fromStoredUrl));
      } else {
        candidates.add(fromStoredUrl);
      }
    }

    for (const objectPath of candidates) {
      if (!objectPath) continue;
      const exists = await this.storage.objectExists(bucket, objectPath);
      if (!exists) continue;

      const signed = await this.storage.createSignedDownloadUrl(bucket, objectPath);
      if (signed) return signed;
    }

    return null;
  }

  private async enrichClip(clip: Clip): Promise<EnrichedClip> {
    if (clip.status !== 'completed' || !clip.storage_path) {
      return { ...clip, download_url: null, thumbnail_url: clip.thumbnail_url };
    }

    const bucket = this.clipsBucket();
    const download_url = await this.storage.createSignedDownloadUrl(
      bucket,
      clip.storage_path,
    );

    const thumbnail_url = await this.resolveThumbnailUrl(clip);

    return { ...clip, download_url, thumbnail_url };
  }

  async generate(userId: string, dto: GenerateClipsDto) {
    const video = await this.videosRepo.getById(dto.video_id, userId);
    if (!video) throw new NotFoundException('Video not found');
    if (video.status !== 'ready') {
      throw new BadRequestException('Video is not ready for processing');
    }

    const clipCount = dto.clip_count ?? 3;
    const costPerClip = this.config.get<number>('clipCreditCost') ?? 5;
    const totalCost = costPerClip * clipCount;

    await this.usersRepo.deductCredits(
      userId,
      totalCost,
      'clip_generation',
      dto.video_id,
    );

    const job = await this.jobsService.enqueueAndDispatch({
      user_id: userId,
      video_id: dto.video_id,
      job_type: JobType.GENERATE_CLIPS,
      payload: {
        video_id: dto.video_id,
        clip_count: clipCount,
        aspect_ratio: dto.aspect_ratio ?? '9:16',
        with_subtitles: dto.with_subtitles ?? true,
        durations: dto.durations ?? [15, 30, 45, 60],
        caption_style: dto.caption_style ?? 'viral',
        caption_language: dto.caption_language ?? 'en',
        platforms: dto.platforms ?? ['tiktok', 'instagram', 'youtube'],
        export_quality: dto.export_quality ?? 'hd',
      },
    });

    return job;
  }

  async list(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const { items, total } = await this.clipsRepo.listByUser(userId, limit, offset);
    const publications = await this.publicationsRepo.listByClipIds(items.map((c) => c.id));
    const pubsByClip = new Map<string, ClipPublication[]>();
    for (const pub of publications) {
      const list = pubsByClip.get(pub.clip_id) ?? [];
      list.push(pub);
      pubsByClip.set(pub.clip_id, list);
    }

    const enriched = await Promise.all(
      items.map(async (clip) => ({
        ...(await this.enrichClip(clip)),
        publications: pubsByClip.get(clip.id) ?? [],
      })),
    );
    return { items: enriched, total };
  }

  async get(userId: string, clipId: string) {
    const clip = await this.clipsRepo.getById(clipId, userId);
    if (!clip) throw new NotFoundException('Clip not found');
    const enriched = await this.enrichClip(clip);
    const publications = await this.publicationsRepo.listByClip(clipId, userId);
    return { ...enriched, publications };
  }

  async getPublications(userId: string, clipId: string) {
    const clip = await this.clipsRepo.getById(clipId, userId);
    if (!clip) throw new NotFoundException('Clip not found');
    return this.publicationsRepo.listByClip(clipId, userId);
  }

  async publish(userId: string, clipId: string, dto: PublishClipDto) {
    const clip = await this.clipsRepo.getById(clipId, userId);
    if (!clip) throw new NotFoundException('Clip not found');
    if (clip.status !== 'completed' || !clip.storage_path) {
      throw new BadRequestException('Clip is not ready to publish');
    }

    const connections = await this.platformsRepo.listByUser(userId);
    const connected = new Set(connections.map((c) => c.platform));
    const missing = dto.platforms.filter((p) => !connected.has(p));
    if (missing.length) {
      throw new BadRequestException(
        `Connect these platforms first: ${missing.join(', ')}. Go to Settings → Platforms.`,
      );
    }

    const unauthorized = dto.platforms.filter((platform) => {
      const conn = connections.find((c) => c.platform === platform);
      return (
        platform === 'youtube' &&
        (conn?.auth_status !== 'authorized' || !conn?.has_tokens)
      );
    });
    if (unauthorized.length) {
      throw new BadRequestException(
        'Authorize YouTube posting in Settings → Platforms before publishing to YouTube Shorts.',
      );
    }

    const job = await this.jobsService.enqueueAndDispatch({
      user_id: userId,
      clip_id: clipId,
      job_type: JobType.PUBLISH_CLIP,
      payload: {
        clip_id: clipId,
        platforms: dto.platforms,
      },
    });

    const publications = [];
    for (const platform of dto.platforms) {
      publications.push(
        await this.publicationsRepo.upsertPending({
          user_id: userId,
          clip_id: clipId,
          platform: platform as PlatformId,
          job_id: job.id,
        }),
      );
    }

    return { job, publications };
  }

  async bulkDownloadUrls(userId: string, clipIds: string[]) {
    const items: EnrichedClip[] = [];

    for (const clipId of clipIds) {
      const clip = await this.clipsRepo.getById(clipId, userId);
      if (!clip) continue;
      if (clip.status !== 'completed' || !clip.storage_path) {
        throw new BadRequestException(`Clip ${clipId} is not ready for download`);
      }
      items.push(await this.enrichClip(clip));
    }

    if (!items.length) {
      throw new NotFoundException('No clips found');
    }

    return items.map((clip) => ({
      id: clip.id,
      title: clip.title,
      download_url: clip.download_url,
      thumbnail_url: clip.thumbnail_url,
    }));
  }

  async export(userId: string, clipId: string) {
    const clip = await this.clipsRepo.getById(clipId, userId);
    if (!clip) throw new NotFoundException('Clip not found');
    if (clip.status !== 'completed') {
      throw new BadRequestException('Clip is not ready for export');
    }

    return this.jobsService.enqueueAndDispatch({
      user_id: userId,
      clip_id: clipId,
      job_type: JobType.EXPORT_CLIP,
      payload: { clip_id: clipId },
    });
  }
}
