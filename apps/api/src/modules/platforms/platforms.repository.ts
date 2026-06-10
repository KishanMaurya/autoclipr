import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import type { PlatformId } from './dto/platform.dto';

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: PlatformId;
  account_name: string | null;
  account_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  auth_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PlatformConnectionPublic = Omit<
  PlatformConnection,
  'access_token' | 'refresh_token'
> & {
  has_tokens: boolean;
};

const PUBLIC_COLUMNS =
  'id, user_id, platform, account_name, account_id, token_expires_at, auth_status, metadata, created_at, updated_at';

@Injectable()
export class PlatformsRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async listByUser(userId: string): Promise<PlatformConnectionPublic[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('platform_connections')
      .select(`${PUBLIC_COLUMNS}, access_token`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const { access_token, ...publicRow } = row as PlatformConnection;
      return {
        ...publicRow,
        has_tokens: !!access_token,
      } as PlatformConnectionPublic;
    });
  }

  async getByPlatform(userId: string, platform: PlatformId): Promise<PlatformConnection | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as PlatformConnection) ?? null;
  }

  async upsert(data: {
    user_id: string;
    platform: PlatformId;
    account_name?: string | null;
    account_id?: string | null;
    access_token?: string | null;
    refresh_token?: string | null;
    token_expires_at?: string | null;
    auth_status?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PlatformConnectionPublic> {
    const existing = await this.getByPlatform(data.user_id, data.platform);

    const { data: row, error } = await this.supabase
      .getClient()
      .from('platform_connections')
      .upsert(
        {
          user_id: data.user_id,
          platform: data.platform,
          account_name: data.account_name ?? existing?.account_name ?? null,
          account_id: data.account_id ?? existing?.account_id ?? null,
          access_token:
            data.access_token !== undefined
              ? data.access_token
              : (existing?.access_token ?? null),
          refresh_token:
            data.refresh_token !== undefined
              ? data.refresh_token
              : (existing?.refresh_token ?? null),
          token_expires_at:
            data.token_expires_at !== undefined
              ? data.token_expires_at
              : (existing?.token_expires_at ?? null),
          auth_status: data.auth_status ?? existing?.auth_status ?? 'connected',
          metadata: data.metadata ?? existing?.metadata ?? {},
        },
        { onConflict: 'user_id,platform' },
      )
      .select(`${PUBLIC_COLUMNS}, access_token`)
      .single();

    if (error) throw new Error(error.message);
    if (!row) throw new Error('Failed to save platform connection');

    const { access_token, ...publicRow } = row as PlatformConnection;
    return { ...publicRow, has_tokens: !!access_token } as PlatformConnectionPublic;
  }

  async saveOAuthTokens(
    userId: string,
    platform: PlatformId,
    tokens: {
      access_token: string;
      refresh_token?: string | null;
      token_expires_at?: string | null;
      account_name?: string | null;
      account_id?: string | null;
    },
  ): Promise<void> {
    const existing = await this.getByPlatform(userId, platform);

    const { error } = await this.supabase
      .getClient()
      .from('platform_connections')
      .upsert(
        {
          user_id: userId,
          platform,
          account_name: tokens.account_name ?? existing?.account_name ?? 'YouTube Shorts',
          account_id: tokens.account_id ?? existing?.account_id ?? null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
          token_expires_at: tokens.token_expires_at ?? null,
          auth_status: 'authorized',
          metadata: existing?.metadata ?? {},
        },
        { onConflict: 'user_id,platform' },
      );

    if (error) throw new Error(error.message);
  }

  async delete(userId: string, platform: PlatformId): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('platform_connections')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform)
      .select('id');

    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  }
}
