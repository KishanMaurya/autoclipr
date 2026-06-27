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

  async deductCredits(
    userId: string,
    amount: number,
    reason: string,
    referenceId?: string,
  ): Promise<number> {
    const { data: profile, error: readErr } = await this.supabase
      .getClient()
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (readErr) throw new Error(readErr.message);
    const balance = profile?.credits ?? 0;
    if (balance < amount) {
      throw new Error(`insufficient credits: need ${amount}, have ${balance}`);
    }

    const newBalance = balance - amount;

    const { error: updateErr } = await this.supabase
      .getClient()
      .from('profiles')
      .update({ credits: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateErr) throw new Error(updateErr.message);

    const { error: txErr } = await this.supabase.getClient().from('credit_transactions').insert({
      user_id: userId,
      amount: -amount,
      balance_after: newBalance,
      reason,
      reference_id: referenceId ?? null,
    });

    if (txErr) throw new Error(txErr.message);

    return newBalance;
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
