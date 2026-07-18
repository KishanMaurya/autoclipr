import { Injectable, Logger } from '@nestjs/common';

export type InstagramMediaStats = {
  mediaId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

@Injectable()
export class InstagramStatsService {
  private readonly logger = new Logger(InstagramStatsService.name);

  /** Fetch view/like/comment counts for published Reels via the Instagram Graph API. */
  async fetchMediaStats(
    accessToken: string,
    mediaIds: string[],
  ): Promise<InstagramMediaStats[]> {
    if (!mediaIds.length) return [];

    const results = await Promise.all(
      mediaIds.map((id) => this.fetchOne(accessToken, id)),
    );

    return results.filter((r): r is InstagramMediaStats => r !== null);
  }

  private async fetchOne(
    accessToken: string,
    mediaId: string,
  ): Promise<InstagramMediaStats | null> {
    try {
      // like_count / comments_count come from the media object itself (instagram_business_basic).
      // views (play count) requires instagram_business_manage_insights.
      // Meta deprecated the "plays" metric in favor of "views" — request both so this
      // keeps working regardless of which the account's API version returns.
      const [mediaRes, insightsRes] = await Promise.all([
        fetch(
          `https://graph.instagram.com/v21.0/${mediaId}?fields=like_count,comments_count&access_token=${accessToken}`,
        ),
        fetch(
          `https://graph.instagram.com/v21.0/${mediaId}/insights?metric=views&access_token=${accessToken}`,
        ),
      ]);

      const media = mediaRes.ok
        ? ((await mediaRes.json()) as { like_count?: number; comments_count?: number })
        : {};

      let viewCount = 0;
      if (insightsRes.ok) {
        const insights = (await insightsRes.json()) as {
          data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
        };
        viewCount = insights.data?.[0]?.values?.[0]?.value ?? 0;
      } else {
        const errBody = await insightsRes.text();
        this.logger.warn(
          `Instagram insights call failed for media ${mediaId} (status ${insightsRes.status}): ${errBody.slice(0, 300)}`,
        );
      }

      return {
        mediaId,
        viewCount,
        likeCount: media.like_count ?? 0,
        commentCount: media.comments_count ?? 0,
      };
    } catch (err) {
      this.logger.warn(`Failed to fetch Instagram stats for media ${mediaId}: ${err}`);
      return null;
    }
  }
}
