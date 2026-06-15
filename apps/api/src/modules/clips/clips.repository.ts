import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

export interface Clip {
  id: string;
  user_id: string;
  video_id: string;
  title: string;
  start_time_ms: number;
  end_time_ms: number;
  storage_path: string | null;
  thumbnail_url: string | null;
  subtitle_url: string | null;
  status: string;
  ai_score: number | null;
  viral_score: number | null;
  duration_seconds: number | null;
  caption_style: string | null;
  caption_language: string | null;
  platform_targets: string[] | null;
  export_quality: string | null;
  viral_metrics: Record<string, unknown> | null;
  aspect_ratio: string;
  created_at: Date;
  updated_at: Date;
}

const CLIP_COLUMNS =
  'id, user_id, video_id, title, start_time_ms, end_time_ms, storage_path, thumbnail_url, subtitle_url, status, ai_score, viral_score, duration_seconds, caption_style, caption_language, platform_targets, export_quality, viral_metrics, aspect_ratio, created_at, updated_at';

@Injectable()
export class ClipsRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async listByUser(userId: string, limit: number, offset: number) {
    const { data, error, count } = await this.supabase
      .getClient()
      .from('clips')
      .select(CLIP_COLUMNS, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return { items: (data ?? []) as Clip[], total: count ?? 0 };
  }

  async getById(id: string, userId: string): Promise<Clip | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('clips')
      .select(CLIP_COLUMNS)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as Clip) ?? null;
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('clips')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return !!data;
  }
}
