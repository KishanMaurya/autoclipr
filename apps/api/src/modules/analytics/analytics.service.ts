import { Injectable } from '@nestjs/common';
import { PublicationsRepository, type PostedPublicationRow } from '../clips/publications.repository';
import { PlatformsRepository } from '../platforms/platforms.repository';
import { StorageService } from '../storage/storage.service';
import { YoutubeStatsService } from './youtube-stats.service';

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube Shorts',
  instagram: 'Instagram Reels',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly publicationsRepo: PublicationsRepository,
    private readonly platformsRepo: PlatformsRepository,
    private readonly youtubeStats: YoutubeStatsService,
    private readonly storage: StorageService,
  ) {}

  async getOverview(userId: string, refresh = false) {
    if (refresh) {
      await this.refreshMetrics(userId);
    }

    const [platforms, publications, counts] = await Promise.all([
      this.platformsRepo.listByUser(userId),
      this.publicationsRepo.listPostedByUser(userId, 100),
      this.publicationsRepo.countByUser(userId),
    ]);

    const enrichedPublications = await Promise.all(
      publications.map((pub) => this.enrichPublication(pub)),
    );

    const byPlatform: Record<
      string,
      { posted_count: number; total_views: number; total_likes: number }
    > = {};

    let totalViews = 0;
    let totalLikes = 0;

    for (const pub of enrichedPublications) {
      const key = pub.platform;
      if (!byPlatform[key]) {
        byPlatform[key] = { posted_count: 0, total_views: 0, total_likes: 0 };
      }
      byPlatform[key].posted_count += 1;
      byPlatform[key].total_views += pub.view_count ?? 0;
      byPlatform[key].total_likes += pub.like_count ?? 0;
      totalViews += pub.view_count ?? 0;
      totalLikes += pub.like_count ?? 0;
    }

    return {
      summary: {
        posted_count: counts.posted,
        failed_count: counts.failed,
        pending_count: counts.pending,
        total_views: totalViews,
        total_likes: totalLikes,
        connected_platforms_count: platforms.length,
      },
      connected_platforms: platforms.map((p) => ({
        platform: p.platform,
        platform_label: PLATFORM_LABELS[p.platform] ?? p.platform,
        account_name: p.account_name,
        auth_status: p.auth_status,
        can_post: p.auth_status === 'authorized' && p.has_tokens,
        metrics_supported: p.platform === 'youtube',
      })),
      by_platform: byPlatform,
      publications: enrichedPublications,
    };
  }

  async refreshMetrics(userId: string) {
    const youtubeConn = await this.platformsRepo.getByPlatform(userId, 'youtube');
    if (!youtubeConn?.access_token) return { refreshed: 0 };

    const publications = await this.publicationsRepo.listPostedByUser(userId, 200);
    const youtubePosts = publications.filter(
      (p) => p.platform === 'youtube' && p.platform_post_id,
    );

    if (!youtubePosts.length) return { refreshed: 0 };

    const videoIds = youtubePosts.map((p) => p.platform_post_id!).filter(Boolean);

    const stats = await this.youtubeStats.fetchVideoStats(
      youtubeConn.access_token,
      videoIds,
      youtubeConn.refresh_token,
      async (tokens) => {
        await this.platformsRepo.saveOAuthTokens(userId, 'youtube', {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expires_at,
        });
      },
    );

    const statsMap = new Map(stats.map((s) => [s.videoId, s]));
    let refreshed = 0;

    for (const pub of youtubePosts) {
      const stat = statsMap.get(pub.platform_post_id!);
      if (!stat) continue;

      await this.publicationsRepo.updateMetrics(pub.id, {
        view_count: stat.viewCount,
        like_count: stat.likeCount,
        comment_count: stat.commentCount,
      });
      refreshed += 1;
    }

    return { refreshed };
  }

  private async enrichPublication(pub: PostedPublicationRow) {
    const bucket = this.storage.clipsBucket();
    let thumbnail_url: string | null = null;

    if (pub.clip_storage_path) {
      const thumbPath = this.storage.clipThumbPath(pub.clip_storage_path);
      if (await this.storage.objectExists(bucket, thumbPath)) {
        thumbnail_url = await this.storage.createSignedDownloadUrl(bucket, thumbPath);
      }
    }

    return {
      id: pub.id,
      clip_id: pub.clip_id,
      clip_title: pub.clip_title,
      platform: pub.platform,
      platform_label: PLATFORM_LABELS[pub.platform] ?? pub.platform,
      platform_post_id: pub.platform_post_id,
      platform_post_url: pub.platform_post_url,
      posted_at: pub.posted_at,
      view_count: Number(pub.view_count ?? 0),
      like_count: Number(pub.like_count ?? 0),
      comment_count: Number(pub.comment_count ?? 0),
      metrics_updated_at: pub.metrics_updated_at,
      metrics_supported: pub.platform === 'youtube',
      thumbnail_url,
    };
  }
}
