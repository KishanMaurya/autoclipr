import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

export interface Video {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: string | null;
  status: string;
  mime_type: string | null;
  source_url: string | null;
  source_type: string | null;
  analysis: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

const VIDEO_COLUMNS =
  'id, user_id, title, description, storage_path, thumbnail_url, duration_seconds, file_size_bytes, status, mime_type, source_url, source_type, analysis, created_at, updated_at';

@Injectable()
export class VideosRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async create(video: {
    user_id: string;
    title: string;
    storage_path: string;
    status: string;
    mime_type?: string;
    file_size_bytes?: number;
    source_url?: string;
    source_type?: string;
  }): Promise<Video> {
    const { data, error } = await this.supabase
      .getClient()
      .from('videos')
      .insert({
        user_id: video.user_id,
        title: video.title,
        storage_path: video.storage_path,
        status: video.status,
        mime_type: video.mime_type ?? null,
        file_size_bytes: video.file_size_bytes ?? null,
        source_url: video.source_url ?? null,
        source_type: video.source_type ?? 'upload',
      })
      .select(VIDEO_COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to create video');
    return data as Video;
  }

  async listByUser(userId: string, limit: number, offset: number) {
    const { data, error, count } = await this.supabase
      .getClient()
      .from('videos')
      .select(VIDEO_COLUMNS, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return { items: (data ?? []) as Video[], total: count ?? 0 };
  }

  async getById(id: string, userId: string): Promise<Video | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('videos')
      .select(VIDEO_COLUMNS)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as Video) ?? null;
  }

  async updateStatus(id: string, status: string) {
    const { error } = await this.supabase
      .getClient()
      .from('videos')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async updateAnalysis(id: string, analysis: Record<string, unknown>, status?: string) {
    const payload: Record<string, unknown> = {
      analysis,
      updated_at: new Date().toISOString(),
    };
    if (status) payload.status = status;

    const { error } = await this.supabase
      .getClient()
      .from('videos')
      .update(payload)
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async updateStoragePath(id: string, storagePath: string) {
    const { error } = await this.supabase
      .getClient()
      .from('videos')
      .update({ storage_path: storagePath, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async updateAfterImport(
    id: string,
    data: {
      storage_path: string;
      duration_seconds: number;
      status: string;
      thumbnail_url?: string;
    },
  ) {
    const { error } = await this.supabase
      .getClient()
      .from('videos')
      .update({
        storage_path: data.storage_path,
        duration_seconds: data.duration_seconds,
        status: data.status,
        thumbnail_url: data.thumbnail_url ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}
