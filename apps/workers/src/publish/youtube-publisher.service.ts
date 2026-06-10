import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';

type UploadShortOptions = {
  accessToken: string;
  refreshToken: string | null;
  title: string;
  localClipPath: string;
  onTokenRefresh: (tokens: {
    access_token: string;
    refresh_token?: string | null;
    expires_at: string | null;
  }) => Promise<void>;
};

@Injectable()
export class YoutubePublisherService {
  private readonly logger = new Logger(YoutubePublisherService.name);

  constructor(private readonly config: ConfigService) {}

  async uploadShort(opts: UploadShortOptions): Promise<{ postId: string | null; postUrl: string | null }> {
    let accessToken = opts.accessToken;

    const stat = await fs.stat(opts.localClipPath);
    const metadata = {
      snippet: {
        title: opts.title.slice(0, 100),
        description: `${opts.title}\n\nCreated with AutoClipr.ai`,
        categoryId: '22',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    };

    let initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': String(stat.size),
        },
        body: JSON.stringify(metadata),
      },
    );

    if (initRes.status === 401 && opts.refreshToken) {
      const refreshed = await this.refreshAccessToken(opts.refreshToken);
      accessToken = refreshed.access_token;
      await opts.onTokenRefresh(refreshed);
      initRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'video/mp4',
            'X-Upload-Content-Length': String(stat.size),
          },
          body: JSON.stringify(metadata),
        },
      );
    }

    if (!initRes.ok) {
      const text = await initRes.text();
      throw new Error(`YouTube upload init failed (${initRes.status}): ${text.slice(0, 300)}`);
    }

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) throw new Error('YouTube did not return an upload URL');

    const fileBuffer = await fs.readFile(opts.localClipPath);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(fileBuffer.length),
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`YouTube upload failed (${uploadRes.status}): ${text.slice(0, 300)}`);
    }

    const body = (await uploadRes.json()) as { id?: string };
    const videoId = body.id ?? null;
    this.logger.log(`YouTube Short uploaded: ${videoId ?? 'unknown'}`);

    return {
      postId: videoId,
      postUrl: videoId ? `https://youtube.com/shorts/${videoId}` : null,
    };
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
      const text = await res.text();
      throw new Error(`YouTube token refresh failed: ${text.slice(0, 200)}`);
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
