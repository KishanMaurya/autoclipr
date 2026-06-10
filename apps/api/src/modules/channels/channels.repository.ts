import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

export interface YoutubeChannel {
  id: string;
  user_id: string;
  channel_url: string;
  channel_name: string;
  thumbnail_url: string | null;
  is_trial_channel: boolean;
  created_at: string;
}

@Injectable()
export class ChannelsRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async listByUser(userId: string): Promise<YoutubeChannel[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('youtube_channels')
      .select(
        'id, user_id, channel_url, channel_name, thumbnail_url, is_trial_channel, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as YoutubeChannel[];
  }

  async create(data: {
    user_id: string;
    channel_url: string;
    channel_name: string;
    thumbnail_url?: string;
    is_trial_channel?: boolean;
  }): Promise<YoutubeChannel> {
    const { data: row, error } = await this.supabase
      .getClient()
      .from('youtube_channels')
      .insert({
        user_id: data.user_id,
        channel_url: data.channel_url,
        channel_name: data.channel_name,
        thumbnail_url: data.thumbnail_url ?? null,
        is_trial_channel: data.is_trial_channel ?? true,
      })
      .select(
        'id, user_id, channel_url, channel_name, thumbnail_url, is_trial_channel, created_at',
      )
      .single();

    if (error) throw new Error(error.message);
    if (!row) throw new Error('Failed to connect channel');
    return row as YoutubeChannel;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('youtube_channels')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  }
}
