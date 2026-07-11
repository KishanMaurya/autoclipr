import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '@autoclipr/monitoring';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../lib/supabase-client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DatabaseService } from '../database/database.service';
import { TempFilesService } from '../pipeline/temp-files.service';
import { YoutubePublisherService } from './youtube-publisher.service';
import { InstagramPublisherService } from './instagram-publisher.service';

type PlatformId = 'youtube' | 'instagram' | 'facebook' | 'tiktok';

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);
  private readonly supabase: SupabaseClient | null;

  constructor(
    private readonly db: DatabaseService,
    private readonly temp: TempFilesService,
    private readonly youtube: YoutubePublisherService,
    private readonly instagram: InstagramPublisherService,
    private readonly config: ConfigService,
    private readonly monitoring: MonitoringService,
  ) {
    const url = this.config.get<string>('supabaseUrl');
    const key = this.config.get<string>('supabaseServiceKey');
    this.supabase = url && key ? createServerSupabaseClient(url, key) : null;
  }

  async run(data: Record<string, unknown>, jobId?: string): Promise<void> {
    const clipId = data.clip_id as string;
    const platforms = (data.platforms as PlatformId[]) ?? [];
    const titleOverride = data.title as string | undefined;

    this.monitoring.logAction('start', 'PublishService.run', {
      clipId,
      jobId,
      platforms: platforms.join(','),
    });

    const clipRes = await this.db.client.query(
      `SELECT id, user_id, title, storage_path, status FROM clips WHERE id = $1`,
      [clipId],
    );
    const clip = clipRes.rows[0];
    if (!clip?.storage_path || clip.status !== 'completed') {
      throw new Error('Clip is not ready for publishing');
    }

    const workDir = await this.temp.createJobDir(`publish_${clipId}`);
    const localClipPath = path.join(workDir, 'clip.mp4');

    try {
      await this.downloadClip(clip.storage_path as string, localClipPath);

      for (const platform of platforms) {
        await this.db.client.query(
          `UPDATE clip_publications SET status = 'processing', error_message = NULL, updated_at = NOW()
           WHERE clip_id = $1 AND platform = $2`,
          [clipId, platform],
        );

        try {
          this.monitoring.logAction('start', `PublishService.publishToPlatform.${platform}`, {
            clipId,
            userId: clip.user_id as string,
            platform,
          });

          const result = await this.publishToPlatform({
            platform,
            userId: clip.user_id as string,
            clipId,
            title: (titleOverride || (clip.title as string)),
            localClipPath,
          });

          await this.db.client.query(
            `UPDATE clip_publications
             SET status = 'posted', platform_post_id = $1, platform_post_url = $2,
                 posted_at = NOW(), error_message = NULL, updated_at = NOW()
             WHERE clip_id = $3 AND platform = $4`,
            [result.postId, result.postUrl, clipId, platform],
          );

          this.monitoring.logAction('success', `PublishService.publishToPlatform.${platform}`, {
            clipId,
            userId: clip.user_id as string,
            platform,
            postId: result.postId ?? undefined,
            postUrl: result.postUrl ?? undefined,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Publish failed';
          this.logger.error(`Publish failed clip=${clipId} platform=${platform}: ${message}`);
          this.monitoring.logAction('failure', `PublishService.publishToPlatform.${platform}`, {
            clipId,
            userId: clip.user_id as string,
            platform,
            errorMessage: message,
          });
          await this.db.client.query(
            `UPDATE clip_publications
             SET status = 'failed', error_message = $1, updated_at = NOW()
             WHERE clip_id = $2 AND platform = $3`,
            [message.slice(0, 500), clipId, platform],
          );
        }
      }

      if (jobId) {
        await this.db.client.query(
          `UPDATE processing_jobs SET status = 'completed', result = $1::jsonb, completed_at = NOW() WHERE id = $2`,
          [
            JSON.stringify({ clip_id: clipId, platforms, status: 'completed' }),
            jobId,
          ],
        );
      }

      this.monitoring.logAction('success', 'PublishService.run', {
        clipId,
        jobId,
        userId: clip.user_id as string,
        platforms: platforms.join(','),
      });
    } finally {
      await this.temp.cleanup(workDir);
    }
  }

  private async downloadClip(storagePath: string, localPath: string): Promise<void> {
    if (!this.supabase) throw new Error('Supabase storage not configured');

    const bucket = this.config.get<string>('buckets.clips') ?? 'clips';
    const { data, error } = await this.supabase.storage.from(bucket).download(storagePath);
    if (error || !data) {
      throw new Error(`Failed to download clip: ${error?.message ?? 'unknown error'}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    await fs.writeFile(localPath, buffer);
  }

  private async publishToPlatform(opts: {
    platform: PlatformId;
    userId: string;
    clipId: string;
    title: string;
    localClipPath: string;
  }): Promise<{ postId: string | null; postUrl: string | null }> {
    const connRes = await this.db.client.query(
      `SELECT platform, access_token, refresh_token, token_expires_at, auth_status
       FROM platform_connections WHERE user_id = $1 AND platform = $2`,
      [opts.userId, opts.platform],
    );
    const conn = connRes.rows[0];
    if (!conn) throw new Error(`${opts.platform} is not connected`);

    switch (opts.platform) {
      case 'youtube':
        if (conn.auth_status !== 'authorized' || !conn.access_token) {
          throw new Error(
            'YouTube posting account not authorized. Go to Settings → Platforms and authorize YouTube.',
          );
        }
        return this.youtube.uploadShort({
          accessToken: conn.access_token as string,
          refreshToken: conn.refresh_token as string | null,
          title: opts.title,
          localClipPath: opts.localClipPath,
          onTokenRefresh: async (tokens) => {
            await this.db.client.query(
              `UPDATE platform_connections
               SET access_token = $1, refresh_token = COALESCE($2, refresh_token),
                   token_expires_at = $3, auth_status = 'authorized', updated_at = NOW()
               WHERE user_id = $4 AND platform = 'youtube'`,
              [tokens.access_token, tokens.refresh_token ?? null, tokens.expires_at, opts.userId],
            );
          },
        });
      case 'instagram': {
        if (conn.auth_status !== 'authorized' || !conn.access_token) {
          throw new Error(
            'Instagram not authorized. Go to Settings → Platforms and reconnect Instagram.',
          );
        }
        if (!conn.account_id) {
          throw new Error(
            'Instagram user ID missing. Disconnect and reconnect Instagram in Settings → Platforms.',
          );
        }
        return this.instagram.uploadReel({
          accessToken: conn.access_token as string,
          igUserId: conn.account_id as string,
          title: opts.title,
          localClipPath: opts.localClipPath,
          onTokenRefresh: async (newToken, expiresAt) => {
            await this.db.client.query(
              `UPDATE platform_connections
               SET access_token = $1, token_expires_at = $2, auth_status = 'authorized', updated_at = NOW()
               WHERE user_id = $3 AND platform = 'instagram'`,
              [newToken, expiresAt, opts.userId],
            );
          },
        });
      }
      case 'facebook':
        throw new Error(
          'Facebook posting requires Meta OAuth (coming soon). Download the clip and post manually for now.',
        );
      case 'tiktok':
        throw new Error('TikTok posting is not available yet.');
      default:
        throw new Error(`Unsupported platform: ${opts.platform}`);
    }
  }
}
