import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type YoutubeVideoStats = {
  videoId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

@Injectable()
export class YoutubeStatsService {
  constructor(private readonly config: ConfigService) {}

  async fetchVideoStats(
    accessToken: string,
    videoIds: string[],
    refreshToken?: string | null,
    onTokenRefresh?: (tokens: {
      access_token: string;
      refresh_token?: string | null;
      expires_at: string | null;
    }) => Promise<void>,
  ): Promise<YoutubeVideoStats[]> {
    if (!videoIds.length) return [];

    let token = accessToken;
    let res = await this.requestStats(token, videoIds);

    if (res.status === 401 && refreshToken && onTokenRefresh) {
      const refreshed = await this.refreshAccessToken(refreshToken);
      token = refreshed.access_token;
      await onTokenRefresh(refreshed);
      res = await this.requestStats(token, videoIds);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube stats failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const body = (await res.json()) as {
      items?: Array<{
        id?: string;
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }>;
    };

    return (body.items ?? []).map((item) => ({
      videoId: item.id ?? '',
      viewCount: Number(item.statistics?.viewCount ?? 0),
      likeCount: Number(item.statistics?.likeCount ?? 0),
      commentCount: Number(item.statistics?.commentCount ?? 0),
    }));
  }

  private async requestStats(accessToken: string, videoIds: string[]) {
    const params = new URLSearchParams({
      part: 'statistics',
      id: videoIds.slice(0, 50).join(','),
    });

    return fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  private async refreshAccessToken(refreshToken: string) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.get<string>('googleClientId') ?? '',
        client_secret: this.config.get<string>('googleClientSecret') ?? '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      throw new Error('YouTube token refresh failed');
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? refreshToken,
      expires_at:
        data.expires_in != null
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
    };
  }
}
