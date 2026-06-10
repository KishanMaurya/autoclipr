import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import type { PlatformId } from '../platforms/dto/platform.dto';

export interface ClipPublication {
  id: string;
  user_id: string;
  clip_id: string;
  platform: PlatformId;
  status: string;
  platform_post_id: string | null;
  platform_post_url: string | null;
  error_message: string | null;
  job_id: string | null;
  posted_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  metrics_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostedPublicationRow extends ClipPublication {
  clip_title: string;
  clip_thumbnail_url: string | null;
  clip_storage_path: string | null;
  clip_viral_score: number | null;
}

const PUBLICATION_COLUMNS =
  'id, user_id, clip_id, platform, status, platform_post_id, platform_post_url, error_message, job_id, posted_at, view_count, like_count, comment_count, metrics_updated_at, created_at, updated_at';

@Injectable()
export class PublicationsRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async listByClipIds(clipIds: string[]): Promise<ClipPublication[]> {
    if (!clipIds.length) return [];

    const { data, error } = await this.supabase
      .getClient()
      .from('clip_publications')
      .select(PUBLICATION_COLUMNS)
      .in('clip_id', clipIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as ClipPublication[];
  }

  async listByClip(clipId: string, userId: string): Promise<ClipPublication[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('clip_publications')
      .select(PUBLICATION_COLUMNS)
      .eq('clip_id', clipId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as ClipPublication[];
  }

  async upsertPending(data: {
    user_id: string;
    clip_id: string;
    platform: PlatformId;
    job_id?: string | null;
  }): Promise<ClipPublication> {
    const { data: row, error } = await this.supabase
      .getClient()
      .from('clip_publications')
      .upsert(
        {
          user_id: data.user_id,
          clip_id: data.clip_id,
          platform: data.platform,
          status: 'pending',
          job_id: data.job_id ?? null,
          error_message: null,
          platform_post_id: null,
          platform_post_url: null,
          posted_at: null,
        },
        { onConflict: 'clip_id,platform' },
      )
      .select(PUBLICATION_COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    if (!row) throw new Error('Failed to create publication');
    return row as ClipPublication;
  }

  async listPostedByUser(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<PostedPublicationRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('clip_publications')
      .select(
        `${PUBLICATION_COLUMNS}, clips!inner(title, thumbnail_url, viral_score, storage_path)`,
      )
      .eq('user_id', userId)
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    type JoinedRow = ClipPublication & {
      clips: {
        title?: string;
        thumbnail_url?: string | null;
        viral_score?: number | null;
        storage_path?: string | null;
      } | null;
    };

    return (data ?? []).map((row) => {
      const { clips, ...pub } = row as JoinedRow;
      return {
        ...pub,
        clip_title: clips?.title ?? 'Untitled clip',
        clip_thumbnail_url: clips?.thumbnail_url ?? null,
        clip_storage_path: clips?.storage_path ?? null,
        clip_viral_score: clips?.viral_score ?? null,
      };
    });
  }

  async countByUser(userId: string): Promise<{
    posted: number;
    failed: number;
    pending: number;
  }> {
    const statuses = ['posted', 'failed', 'pending'] as const;
    const counts = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await this.supabase
          .getClient()
          .from('clip_publications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', status);
        if (error) throw new Error(error.message);
        return count ?? 0;
      }),
    );

    return { posted: counts[0], failed: counts[1], pending: counts[2] };
  }

  async updateMetrics(
    publicationId: string,
    metrics: {
      view_count: number;
      like_count: number;
      comment_count: number;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('clip_publications')
      .update({
        view_count: metrics.view_count,
        like_count: metrics.like_count,
        comment_count: metrics.comment_count,
        metrics_updated_at: new Date().toISOString(),
      })
      .eq('id', publicationId);

    if (error) throw new Error(error.message);
  }
}
