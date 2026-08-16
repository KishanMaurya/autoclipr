import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  credits: number;
  subscription_tier: string;
  email_notifications_enabled: boolean;
  welcome_sent: boolean;
  created_at: Date;
  updated_at: Date;
}

const PROFILE_COLUMNS =
  'id, email, full_name, avatar_url, phone, credits, subscription_tier, email_notifications_enabled, welcome_sent, created_at, updated_at';

/**
 * Raised when a credit deduction is rejected because the balance can't cover it.
 * Distinct from a generic Error so callers can map it to a 400 rather than a 500.
 */
export class InsufficientCreditsError extends Error {
  constructor(readonly required: number) {
    super(`insufficient credits: need ${required}`);
    this.name = 'InsufficientCreditsError';
  }
}

@Injectable()
export class UsersRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as Profile) ?? null;
  }

  async upsertFromAuth(
    id: string,
    email: string,
    fullName: string,
    avatarUrl: string,
    phone = '',
  ): Promise<Profile> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .upsert(
        {
          id,
          email: email || '',
          full_name: fullName || null,
          avatar_url: avatarUrl || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to upsert profile');
    return data as Profile;
  }

  /** Ensures a profile row exists — safe to call for any authenticated user */
  async ensureProfile(userId: string, email = ''): Promise<void> {
    const { data } = await this.supabase.getClient()
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (!data) {
      await this.upsertFromAuth(userId, email, '', '').catch(() => {});
    }
  }

  async updateProfile(
    userId: string,
    patch: { full_name?: string; email?: string; phone?: string; avatar_url?: string | null; email_notifications_enabled?: boolean },
  ): Promise<Profile> {
    const updates: Record<string, string | boolean | null> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.full_name !== undefined) updates.full_name = patch.full_name || null;
    if (patch.email !== undefined) updates.email = patch.email;
    if (patch.phone !== undefined) updates.phone = patch.phone || null;
    if (patch.avatar_url !== undefined) updates.avatar_url = patch.avatar_url || null;
    if (patch.email_notifications_enabled !== undefined) updates.email_notifications_enabled = patch.email_notifications_enabled;

    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Profile not found');
    return data as Profile;
  }

  /**
   * Spend credits atomically. Delegates to the deduct_credits_atomic RPC so the
   * balance check and the debit happen in one locked statement — a read-then-write
   * from here would let concurrent requests all pass the check against the same
   * stale balance and overspend.
   *
   * Throws InsufficientCreditsError when the balance can't cover `amount`;
   * nothing is written in that case.
   */
  async deductCredits(
    userId: string,
    amount: number,
    reason: string,
    referenceId?: string,
  ): Promise<number> {
    const { data, error } = await this.supabase.getClient().rpc('deduct_credits_atomic', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_reference_id: referenceId ?? null,
    });

    if (error) throw new Error(error.message);
    if (data === null || data === undefined) {
      throw new InsufficientCreditsError(amount);
    }

    return data as number;
  }

  /**
   * Return credits that were taken up front for work that never completed.
   * Best-effort by design: the caller is already handling a failure, so a
   * refund problem is logged rather than allowed to mask the original error.
   */
  async refundCredits(
    userId: string,
    amount: number,
    reason: string,
    referenceId?: string,
  ): Promise<number | null> {
    const { data, error } = await this.supabase.getClient().rpc('refund_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_reference_id: referenceId ?? null,
    });

    if (error) throw new Error(error.message);
    return (data as number | null) ?? null;
  }

  async listCreditTransactions(userId: string, limit = 50) {
    const { data, error } = await this.supabase
      .getClient()
      .from('credit_transactions')
      .select('id, amount, balance_after, reason, reference_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getSubscription(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('user_subscriptions')
      .select(
        'id, user_id, plan_id, status, current_period_start, current_period_end, stripe_subscription_id',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async heartbeat(userId: string): Promise<void> {
    await this.supabase
      .getClient()
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);
  }

  async markWelcomeSent(userId: string): Promise<void> {
    await this.supabase
      .getClient()
      .from('profiles')
      .update({ welcome_sent: true })
      .eq('id', userId);
  }

  async listPlans() {
    const { data, error } = await this.supabase
      .getClient()
      .from('subscription_plans')
      .select('id, name, price_cents, credits_per_month, max_videos, features')
      .eq('active', true)
      .order('price_cents', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
