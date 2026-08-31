import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

/** Tiers that are not paying — legacy rows still say 'free'. */
export const FREE_TIERS = ['starter', 'free'] as const;

export interface RetentionVideo {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  retention_warning_sent_at: string | null;
  email: string;
  full_name: string | null;
}

/**
 * Cross-user queries for the Starter retention sweep.
 *
 * Uses the service-role client because the sweep runs without a request
 * context — there is no signed-in user to scope by.
 */
@Injectable()
export class RetentionRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  /** Videos owned by a free-tier user, old enough to warn about, not yet warned. */
  async findVideosToWarn(olderThan: Date, limit: number): Promise<RetentionVideo[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('videos')
      .select('id, user_id, title, created_at, retention_warning_sent_at, profiles!inner(email, full_name, subscription_tier)')
      .is('retention_warning_sent_at', null)
      .lt('created_at', olderThan.toISOString())
      .in('profiles.subscription_tier', [...FREE_TIERS])
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  }

  /**
   * Videos whose warning has aged past the grace period and whose owner is
   * still on a free tier. The tier is re-checked here on purpose: someone who
   * upgraded after being warned must not lose anything.
   */
  async findVideosToDelete(warnedBefore: Date, limit: number): Promise<RetentionVideo[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('videos')
      .select('id, user_id, title, created_at, retention_warning_sent_at, profiles!inner(email, full_name, subscription_tier)')
      .not('retention_warning_sent_at', 'is', null)
      .lt('retention_warning_sent_at', warnedBefore.toISOString())
      .in('profiles.subscription_tier', [...FREE_TIERS])
      .order('retention_warning_sent_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  }

  async markWarned(videoIds: string[], at: Date): Promise<void> {
    if (!videoIds.length) return;

    const { error } = await this.supabase
      .getClient()
      .from('videos')
      .update({ retention_warning_sent_at: at.toISOString() })
      .in('id', videoIds);

    if (error) throw new Error(error.message);
  }

  /**
   * Drop the warning stamp for a user's videos — called when someone upgrades,
   * so that a later downgrade starts a fresh 3-day window with a fresh warning
   * instead of deleting immediately off a stale stamp.
   */
  async clearWarningsForUser(userId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('videos')
      .update({ retention_warning_sent_at: null })
      .eq('user_id', userId)
      .not('retention_warning_sent_at', 'is', null);

    if (error) throw new Error(error.message);
  }
}

type RawRow = Omit<RetentionVideo, 'email' | 'full_name'> & {
  profiles?: { email?: string; full_name?: string | null } | { email?: string; full_name?: string | null }[];
};

/**
 * PostgREST returns the joined profile as an object for a to-one relation but
 * some client versions type it as an array, so handle both.
 */
function mapRow(row: RawRow): RetentionVideo {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    created_at: row.created_at,
    retention_warning_sent_at: row.retention_warning_sent_at,
    email: profile?.email ?? '',
    full_name: profile?.full_name ?? null,
  };
}
