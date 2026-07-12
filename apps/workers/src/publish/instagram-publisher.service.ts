import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../lib/supabase-client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

type UploadReelOptions = {
  accessToken: string;
  igUserId: string;
  title: string;
  localClipPath: string;
  /** Called when a refreshed long-lived token is issued so we can persist it. */
  onTokenRefresh: (newToken: string, expiresAt: string | null) => Promise<void>;
};

type MediaStatusResponse = {
  status_code?: string;
  status?: string;
  error_message?: string;
};

@Injectable()
export class InstagramPublisherService {
  private readonly logger = new Logger(InstagramPublisherService.name);
  private readonly supabase: SupabaseClient | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('supabaseUrl');
    const key = this.config.get<string>('supabaseServiceKey');
    this.supabase = url && key ? createServerSupabaseClient(url, key) : null;
  }

  async uploadReel(opts: UploadReelOptions): Promise<{ postId: string | null; postUrl: string | null }> {
    // 1. Upload clip to a publicly-accessible Supabase URL so Meta can fetch it
    const publicVideoUrl = await this.uploadToPublicStorage(opts.localClipPath);

    // 2. Create a media container
    const containerId = await this.createMediaContainer(
      opts.igUserId,
      opts.accessToken,
      publicVideoUrl,
      opts.title,
    );

    // 3. Wait for Meta to finish processing the video (poll up to 5 min)
    await this.waitForContainerReady(opts.igUserId, containerId, opts.accessToken);

    // 4. Publish the container → becomes a Reel
    const mediaId = await this.publishContainer(opts.igUserId, containerId, opts.accessToken);

    // 5. Optionally refresh the long-lived token so it doesn't expire
    await this.maybeRefreshToken(opts.accessToken, opts.onTokenRefresh);

    const postUrl = `https://www.instagram.com/p/${mediaId}/`;
    this.logger.log(`Instagram Reel published: ${mediaId}`);
    return { postId: mediaId, postUrl };
  }

  /** Upload clip to the public exports bucket so Meta can download it via URL. */
  private async uploadToPublicStorage(localClipPath: string): Promise<string> {
    if (!this.supabase) throw new Error('Supabase not configured');

    const fileBuffer = await fs.readFile(localClipPath);
    const bucket = this.config.get<string>('buckets.exports') ?? 'exports';
    const objectPath = `ig_publish/${Date.now()}_${path.basename(localClipPath)}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(objectPath, fileBuffer, { contentType: 'video/mp4', upsert: true });

    if (error) throw new Error(`Failed to upload clip to storage: ${error.message}`);

    // Use a signed URL (1 hour) so Instagram can fetch regardless of bucket policy
    const { data: signedData, error: signedError } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 3600);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(`Could not create signed URL for clip: ${signedError?.message ?? 'unknown'}`);
    }

    return signedData.signedUrl;
  }

  /** Step 1 — POST /v21.0/{ig-user-id}/media → returns creation_id */
  private async createMediaContainer(
    igUserId: string,
    accessToken: string,
    videoUrl: string,
    caption: string,
  ): Promise<string> {
    const url = `https://graph.instagram.com/v21.0/${igUserId}/media`;
    const body = new URLSearchParams({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption.slice(0, 2200),
      share_to_feed: 'true',
      access_token: accessToken,
    });

    const res = await fetch(url, { method: 'POST', body });
    const data = (await res.json()) as { id?: string; error?: { message?: string; code?: number } };

    if (!res.ok || !data.id) {
      const msg = data.error?.message ?? JSON.stringify(data);
      throw new Error(`Instagram media container creation failed: ${msg}`);
    }

    this.logger.log(`Instagram container created: ${data.id}`);
    return data.id;
  }

  /**
   * Step 2 — Poll GET /v21.0/{ig-user-id}/media/{container-id}?fields=status_code
   * Meta takes 10–120 seconds to process the video server-side.
   */
  private async waitForContainerReady(
    igUserId: string,
    containerId: string,
    accessToken: string,
    timeoutMs = 300_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const pollIntervalMs = 8_000;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      // Correct endpoint: poll the container directly by its ID
      const url =
        `https://graph.instagram.com/v21.0/${containerId}` +
        `?fields=status_code,status,error_message&access_token=${accessToken}`;

      const res = await fetch(url);
      const data = (await res.json()) as MediaStatusResponse;
      const statusCode = data.status_code ?? data.status ?? 'UNKNOWN';

      this.logger.log(`Instagram container ${containerId} status: ${statusCode}`);

      if (statusCode === 'FINISHED') return;
      if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
        throw new Error(
          `Instagram media processing failed (${statusCode}): ${data.error_message ?? 'unknown'}`,
        );
      }
      // IN_PROGRESS or PUBLISHED — keep polling
    }

    throw new Error('Instagram media processing timed out after 5 minutes');
  }

  /** Step 3 — POST /v21.0/{ig-user-id}/media_publish → returns the published media id */
  private async publishContainer(
    igUserId: string,
    containerId: string,
    accessToken: string,
  ): Promise<string> {
    const url = `https://graph.instagram.com/v21.0/${igUserId}/media_publish`;
    const body = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    const res = await fetch(url, { method: 'POST', body });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };

    if (!res.ok || !data.id) {
      const msg = data.error?.message ?? JSON.stringify(data);
      throw new Error(`Instagram publish failed: ${msg}`);
    }

    return data.id;
  }

  /**
   * Refresh a long-lived Instagram token when it has less than 10 days remaining.
   * Long-lived tokens last 60 days and can be refreshed any time after day 1.
   */
  private async maybeRefreshToken(
    accessToken: string,
    onTokenRefresh: (newToken: string, expiresAt: string | null) => Promise<void>,
  ): Promise<void> {
    try {
      const url =
        `https://graph.instagram.com/refresh_access_token` +
        `?grant_type=ig_refresh_token&access_token=${accessToken}`;

      const res = await fetch(url);
      if (!res.ok) return; // non-fatal — token refresh is best-effort

      const data = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
      };

      if (data.access_token && data.expires_in) {
        const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
        await onTokenRefresh(data.access_token, expiresAt);
        this.logger.log('Instagram long-lived token refreshed');
      }
    } catch {
      // best-effort — don't fail the publish if refresh fails
    }
  }
}
