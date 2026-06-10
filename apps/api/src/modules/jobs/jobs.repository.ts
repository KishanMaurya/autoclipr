import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

@Injectable()
export class JobsRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async enqueue(job: {
    user_id: string;
    video_id?: string;
    clip_id?: string;
    job_type: string;
    payload: Record<string, unknown>;
  }) {
    const { data, error } = await this.supabase
      .getClient()
      .from('processing_jobs')
      .insert({
        user_id: job.user_id,
        video_id: job.video_id ?? null,
        clip_id: job.clip_id ?? null,
        job_type: job.job_type,
        status: 'queued',
        payload: job.payload,
      })
      .select('id, scheduled_at, created_at')
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to enqueue job');
    return data as { id: string; scheduled_at: string; created_at: string };
  }

  async findLatestByVideo(videoId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('processing_jobs')
      .select(
        'id, job_type, status, payload, result, error_message, created_at, completed_at',
      )
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as {
      id: string;
      job_type: string;
      status: string;
      payload: Record<string, unknown>;
      result: Record<string, unknown> | null;
      error_message: string | null;
      created_at: string;
      completed_at: string | null;
    } | null;
  }
}
