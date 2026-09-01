import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

/** Tiers that are not paying. Legacy rows still say 'free'. */
export const FREE_TIERS = ['starter', 'free'] as const;

export interface Campaign {
  id: string;
  name: string;
  type: string;
  coupon_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  scheduled_for: string;
  skip_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ClaimedRecipient {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

export interface EligibleUser {
  id: string;
  email: string;
  full_name: string | null;
}

@Injectable()
export class CampaignsRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  private get db() {
    return this.supabase.getClient();
  }

  /**
   * Find or create the campaign for a given date.
   *
   * Upsert on (type, scheduled_for) rather than insert: a second run on the
   * same Saturday must join the existing campaign, not start a rival one.
   */
  async findOrCreateForDate(
    type: string,
    scheduledFor: string,
    name: string,
    couponId: string | null,
  ): Promise<Campaign> {
    const { data: existing, error: readErr } = await this.db
      .from('email_campaigns')
      .select('*')
      .eq('type', type)
      .eq('scheduled_for', scheduledFor)
      .maybeSingle();

    if (readErr) throw new Error(readErr.message);
    if (existing) return existing as Campaign;

    const { data, error } = await this.db
      .from('email_campaigns')
      .insert({ type, scheduled_for: scheduledFor, name, coupon_id: couponId, status: 'pending' })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as Campaign;
  }

  async updateCampaign(id: string, patch: Partial<Campaign>): Promise<void> {
    const { error } = await this.db.from('email_campaigns').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async listCampaigns(limit = 50): Promise<Campaign[]> {
    const { data, error } = await this.db
      .from('email_campaigns')
      .select('*')
      .order('scheduled_for', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data as Campaign[]) ?? [];
  }

  /**
   * One page of users who should receive the offer.
   *
   * Eligibility is read from the database at send time, never from anything
   * the client believed earlier:
   *   - on a free tier (paying users must never be offered a discount)
   *   - has an email address
   *   - has not turned off notification emails
   *
   * Newsletter unsubscribes are filtered separately by the caller, because
   * that list is keyed by email rather than user id.
   *
   * Paged rather than loaded whole: this table grows with the user base and
   * the job must not depend on it fitting in memory.
   */
  async findEligibleUsers(offset: number, limit: number): Promise<EligibleUser[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, email, full_name')
      .in('subscription_tier', [...FREE_TIERS])
      .not('email', 'is', null)
      .neq('email', '')
      // Only an explicit false is an opt-out; NULL means never set.
      .or('email_notifications_enabled.is.null,email_notifications_enabled.eq.true')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return (data as EligibleUser[]) ?? [];
  }

  /** Emails that have opted out of the newsletter, lowercased for comparison. */
  async unsubscribedEmails(): Promise<Set<string>> {
    const { data, error } = await this.db
      .from('newsletter_subscribers')
      .select('email')
      .not('unsubscribed_at', 'is', null);

    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((r) => String(r.email).toLowerCase()));
  }

  /**
   * Claim a batch of users for this campaign.
   *
   * Inserts with sent_at NULL and ignores conflicts, so users already enrolled
   * by an earlier run are silently skipped. Returns only the rows this call
   * actually created — those are the ones still needing an email.
   */
  async claimRecipients(
    campaignId: string,
    users: EligibleUser[],
  ): Promise<ClaimedRecipient[]> {
    if (!users.length) return [];

    const { data, error } = await this.db
      .from('email_campaign_recipients')
      .upsert(
        users.map((u) => ({ campaign_id: campaignId, user_id: u.id, email: u.email })),
        { onConflict: 'campaign_id,user_id', ignoreDuplicates: true },
      )
      .select('id, user_id, email');

    if (error) throw new Error(error.message);

    // The insert cannot return the profile name, so stitch it back on from
    // the batch we already have in hand rather than re-querying.
    const names = new Map(users.map((u) => [u.id, u.full_name]));
    return ((data as ClaimedRecipient[]) ?? []).map((r) => ({
      ...r,
      full_name: names.get(r.user_id) ?? null,
    }));
  }

  async markSent(recipientId: string): Promise<void> {
    const { error } = await this.db
      .from('email_campaign_recipients')
      .update({ sent_at: new Date().toISOString(), error: null })
      .eq('id', recipientId);

    if (error) throw new Error(error.message);
  }

  async markFailed(recipientId: string, message: string): Promise<void> {
    const { error } = await this.db
      .from('email_campaign_recipients')
      .update({ error: message.slice(0, 500) })
      .eq('id', recipientId);

    if (error) throw new Error(error.message);
  }

  /** Rows claimed by an earlier run that never got their email. */
  async findUnsent(campaignId: string, limit: number): Promise<ClaimedRecipient[]> {
    const { data, error } = await this.db
      .from('email_campaign_recipients')
      // Joined so a retried send greets the user the same way the first would.
      .select('id, user_id, email, profiles(full_name)')
      .eq('campaign_id', campaignId)
      .is('sent_at', null)
      .limit(limit);

    if (error) throw new Error(error.message);

    return ((data ?? []) as Record<string, unknown>[]).map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: String(r.id),
        user_id: String(r.user_id),
        email: String(r.email),
        full_name: (profile as { full_name?: string } | null)?.full_name ?? null,
      };
    });
  }

  /**
   * Attribute a redemption back to the email that drove it.
   *
   * Matched on the most recent campaign the user was actually sent, rather
   * than any campaign row: crediting a campaign that never reached them would
   * inflate its conversion rate.
   */
  async markRedeemed(userId: string, converted: boolean): Promise<void> {
    const { data, error: readErr } = await this.db
      .from('email_campaign_recipients')
      .select('id')
      .eq('user_id', userId)
      .not('sent_at', 'is', null)
      .is('redeemed_at', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (readErr) throw new Error(readErr.message);
    if (!data) return;

    const now = new Date().toISOString();
    const { error } = await this.db
      .from('email_campaign_recipients')
      .update({ redeemed_at: now, ...(converted ? { converted_at: now } : {}) })
      .eq('id', (data as { id: string }).id);

    if (error) throw new Error(error.message);
  }

  /** Stamp delivery/open state reported by the email provider's webhook. */
  async markProviderEvent(
    email: string,
    field: 'delivered_at' | 'opened_at',
  ): Promise<void> {
    const { data, error: readErr } = await this.db
      .from('email_campaign_recipients')
      .select('id')
      .ilike('email', email)
      .not('sent_at', 'is', null)
      .is(field, null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (readErr) throw new Error(readErr.message);
    if (!data) return;

    const { error } = await this.db
      .from('email_campaign_recipients')
      .update({ [field]: new Date().toISOString() })
      .eq('id', (data as { id: string }).id);

    if (error) throw new Error(error.message);
  }

  async markClicked(campaignId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('email_campaign_recipients')
      .update({ clicked_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .is('clicked_at', null);

    if (error) throw new Error(error.message);
  }

  /** Funnel counts for one campaign. */
  async getStats(campaignId: string) {
    const { data, error } = await this.db
      .from('email_campaign_recipients')
      .select('sent_at, delivered_at, opened_at, clicked_at, redeemed_at, converted_at')
      .eq('campaign_id', campaignId);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const count = (key: string) => rows.filter((r) => r[key as keyof typeof r]).length;

    return {
      recipients: rows.length,
      sent: count('sent_at'),
      delivered: count('delivered_at'),
      opened: count('opened_at'),
      clicked: count('clicked_at'),
      redeemed: count('redeemed_at'),
      converted: count('converted_at'),
    };
  }
}
