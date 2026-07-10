import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

function parseAmountPaise(amount: string | null | undefined): number {
  if (!amount || amount === 'Free') return 0;
  const num = parseFloat(amount.replace(/[₹$,\s]/g, ''));
  return isNaN(num) ? 0 : Math.round(num * 100);
}

@Injectable()
export class AdminRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  private get db() { return this.supabase.getClient(); }

  // ─── Users ───────────────────────────────────────────────────────────────

  async getOnlineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await this.db
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen_at', fiveMinutesAgo);
    return count ?? 0;
  }

  async getUserCounts() {
    const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const [r1, r2, r3] = await Promise.all([
      this.db.from('profiles').select('*', { count: 'exact', head: true }),
      this.db.from('profiles').select('*', { count: 'exact', head: true })
        .not('subscription_tier', 'in', '("free","starter")'),
      this.db.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', today),
    ]);
    return { total: r1.count ?? 0, paid: r2.count ?? 0, today: r3.count ?? 0 };
  }

  async getUserGrowthByMonth() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data } = await this.db
      .from('profiles')
      .select('created_at, subscription_tier')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at');

    const months: Record<string, { month: string; total: number; paid: number }> = {};
    for (const u of data ?? []) {
      const m = new Date(u.created_at as string).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, total: 0, paid: 0 };
      months[m].total++;
      const tier = u.subscription_tier as string | null;
      if (tier && !['free', 'starter'].includes(tier)) months[m].paid++;
    }
    return Object.values(months);
  }

  async getRecentUsers(limit = 10) {
    const { data } = await this.db
      .from('profiles')
      .select('id, email, full_name, subscription_tier, credits, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  // ─── Revenue ─────────────────────────────────────────────────────────────

  async getRevenueSummary() {
    const { data } = await this.db
      .from('billing_transactions')
      .select('amount, billing_period, payment_date, plan_id')
      .eq('status', 'paid');

    const transactions = data ?? [];
    const totalPaise = transactions.reduce((s, t) => s + parseAmountPaise(t.amount as string | null), 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthly = transactions
      .filter((t) => (t.payment_date as string | null) != null && (t.payment_date as string) >= thirtyDaysAgo)
      .reduce((s, t) => s + parseAmountPaise(t.amount as string | null), 0);

    const byMonth: Record<string, number> = {};
    transactions.forEach((t) => {
      if (!t.payment_date) return;
      const m = new Date(t.payment_date as string).toLocaleString('default', { month: 'short', year: '2-digit' });
      byMonth[m] = (byMonth[m] ?? 0) + parseAmountPaise(t.amount as string | null);
    });

    const byPlan: Record<string, number> = {};
    transactions.forEach((t) => {
      const plan = (t.plan_id as string | null) ?? 'unknown';
      byPlan[plan] = (byPlan[plan] ?? 0) + parseAmountPaise(t.amount as string | null);
    });

    return { totalPaise, monthlyPaise: monthly, byMonth, byPlan, transactionCount: transactions.length };
  }

  async getRecentTransactions(limit = 10) {
    const { data } = await this.db
      .from('billing_transactions')
      .select('id, invoice_number, plan_id, amount, billing_period, payment_date, user_id')
      .order('payment_date', { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  // ─── Subscriptions ───────────────────────────────────────────────────────

  async getSubscriptionStats() {
    const { data: subs } = await this.db
      .from('user_subscriptions')
      .select('status, plan_id');

    const all = subs ?? [];
    const active = all.filter((s) => s.status === 'active');
    const byPlan: Record<string, number> = {};
    active.forEach((s) => {
      const plan = (s.plan_id as string | null) ?? 'unknown';
      byPlan[plan] = (byPlan[plan] ?? 0) + 1;
    });

    return {
      active: active.length,
      cancelled: all.filter((s) => s.status === 'cancelled').length,
      byPlan,
    };
  }

  // ─── Videos & Clips ──────────────────────────────────────────────────────

  async getVideoStats() {
    const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    const [r1, r2, sizeRes] = await Promise.all([
      this.db.from('videos').select('*', { count: 'exact', head: true }),
      this.db.from('videos').select('*', { count: 'exact', head: true }).gte('created_at', today),
      this.db.from('videos').select('file_size_bytes, duration_seconds').not('file_size_bytes', 'is', null),
    ]);

    const sizeData = sizeRes.data ?? [];
    const totalBytes = sizeData.reduce((s, v) => s + ((v.file_size_bytes as number | null) ?? 0), 0);
    const totalDuration = sizeData.reduce((s, v) => s + ((v.duration_seconds as number | null) ?? 0), 0);
    const avgDuration = sizeData.length > 0 ? Math.round(totalDuration / sizeData.length) : 0;

    return { total: r1.count ?? 0, today: r2.count ?? 0, totalBytes, avgDurationSecs: avgDuration };
  }

  async getClipStats() {
    const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const [r1, r2] = await Promise.all([
      this.db.from('clips').select('*', { count: 'exact', head: true }),
      this.db.from('clips').select('*', { count: 'exact', head: true }).gte('created_at', today),
    ]);
    return { total: r1.count ?? 0, today: r2.count ?? 0 };
  }

  // ─── Affiliates ──────────────────────────────────────────────────────────

  async getAffiliateStats() {
    const { data: affiliates } = await this.db
      .from('affiliates')
      .select('id, status, total_referrals, total_conversions, total_earnings_paise, email, ref_code')
      .order('total_conversions', { ascending: false });

    const all = affiliates ?? [];
    const active = all.filter((a) => a.status === 'active');
    const totalReferrals = all.reduce((s, a) => s + ((a.total_referrals as number | null) ?? 0), 0);
    const totalRevenuePaise = all.reduce((s, a) => s + ((a.total_earnings_paise as number | null) ?? 0), 0);
    const top = all.slice(0, 5).map((a) => ({
      email: (a.email as string | null) ?? (a.ref_code as string | null) ?? '',
      conversions: (a.total_conversions as number | null) ?? 0,
      earningsPaise: (a.total_earnings_paise as number | null) ?? 0,
    }));

    return { total: all.length, active: active.length, totalReferrals, totalRevenuePaise, top };
  }

  // ─── Top Creators (connected user channels) ──────────────────────────────

  async getTopCreators(limit = 50) {
    // Fetch connected channels with user email
    const { data: channels } = await this.db
      .from('youtube_channels')
      .select('id, user_id, channel_name, channel_url, thumbnail_url, is_trial_channel, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!channels || channels.length === 0) return [];

    const userIds = [...new Set((channels as { user_id: string }[]).map((c) => c.user_id))];

    // Fetch profiles (email + tier) for those users
    const { data: profiles } = await this.db
      .from('profiles')
      .select('id, email, subscription_tier, credits')
      .in('id', userIds);

    // Count videos per user
    const { data: videoCounts } = await this.db
      .from('videos')
      .select('user_id')
      .in('user_id', userIds);

    // Count clips per user
    const { data: clipCounts } = await this.db
      .from('clips')
      .select('user_id')
      .in('user_id', userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    const videoMap = new Map<string, number>();
    const clipMap = new Map<string, number>();

    for (const v of videoCounts ?? []) {
      const uid = v.user_id as string;
      videoMap.set(uid, (videoMap.get(uid) ?? 0) + 1);
    }
    for (const c of clipCounts ?? []) {
      const uid = c.user_id as string;
      clipMap.set(uid, (clipMap.get(uid) ?? 0) + 1);
    }

    const result = (channels as {
      id: string;
      user_id: string;
      channel_name: string;
      channel_url: string;
      thumbnail_url: string | null;
      is_trial_channel: boolean;
      created_at: string;
    }[]).map((ch) => {
      const profile = profileMap.get(ch.user_id);
      return {
        id: ch.id,
        channelName: ch.channel_name,
        channelUrl: ch.channel_url,
        thumbnailUrl: ch.thumbnail_url,
        isTrial: ch.is_trial_channel,
        connectedAt: ch.created_at,
        userEmail: (profile?.email as string | null) ?? null,
        tier: (profile?.subscription_tier as string | null) ?? 'free',
        credits: (profile?.credits as number | null) ?? 0,
        videoCount: videoMap.get(ch.user_id) ?? 0,
        clipCount: clipMap.get(ch.user_id) ?? 0,
      };
    });

    // Sort by clip count desc
    result.sort((a, b) => b.clipCount - a.clipCount);
    return result.slice(0, limit);
  }

  // ─── Errors ──────────────────────────────────────────────────────────────

  async getRecentErrors(limit = 50) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [jobsRes, pubsRes, failedVideosRes] = await Promise.all([
      // Failed processing jobs with error messages
      this.db
        .from('processing_jobs')
        .select('id, job_type, error_message, attempts, created_at, updated_at')
        .eq('status', 'failed')
        .not('error_message', 'is', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit),

      // Failed clip publications
      this.db
        .from('clip_publications')
        .select('id, platform, error_message, created_at, updated_at')
        .eq('status', 'failed')
        .not('error_message', 'is', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit),

      // Videos stuck in failed state
      this.db
        .from('videos')
        .select('id, title, status, created_at, updated_at')
        .eq('status', 'failed')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    type ErrorEntry = {
      id: string;
      level: 'error' | 'warning' | 'info';
      message: string;
      service: string;
      count: number;
      lastSeen: string;
    };

    const entries: ErrorEntry[] = [];

    // Group repeated processing job errors by message
    const jobErrors = new Map<string, { count: number; lastSeen: string; id: string; service: string }>();
    for (const j of jobsRes.data ?? []) {
      const msg = (j.error_message as string) ?? 'Unknown error';
      const service = (j.job_type as string) ?? 'worker';
      const key = `${service}::${msg}`;
      const existing = jobErrors.get(key);
      const ts = (j.updated_at as string) ?? (j.created_at as string);
      if (!existing || ts > existing.lastSeen) {
        jobErrors.set(key, { count: (existing?.count ?? 0) + 1, lastSeen: ts, id: j.id as string, service });
      } else {
        existing.count++;
      }
    }
    for (const [key, v] of jobErrors) {
      const msg = key.split('::').slice(1).join('::');
      entries.push({ id: v.id, level: 'error', message: msg, service: v.service, count: v.count, lastSeen: v.lastSeen });
    }

    // Group publication errors by message+platform
    const pubErrors = new Map<string, { count: number; lastSeen: string; id: string; platform: string }>();
    for (const p of pubsRes.data ?? []) {
      const msg = (p.error_message as string) ?? 'Publish failed';
      const platform = (p.platform as string) ?? 'platform';
      const key = `${platform}::${msg}`;
      const existing = pubErrors.get(key);
      const ts = (p.updated_at as string) ?? (p.created_at as string);
      if (!existing || ts > existing.lastSeen) {
        pubErrors.set(key, { count: (existing?.count ?? 0) + 1, lastSeen: ts, id: p.id as string, platform });
      } else {
        existing.count++;
      }
    }
    for (const [key, v] of pubErrors) {
      const msg = key.split('::').slice(1).join('::');
      entries.push({ id: v.id, level: 'warning', message: `[${v.platform}] ${msg}`, service: 'publishing', count: v.count, lastSeen: v.lastSeen });
    }

    // Failed videos (no error_message column, just count)
    const failedVideos = failedVideosRes.data ?? [];
    if (failedVideos.length > 0) {
      entries.push({
        id: 'failed-videos',
        level: 'warning',
        message: `${failedVideos.length} video(s) stuck in failed status`,
        service: 'video-processor',
        count: failedVideos.length,
        lastSeen: (failedVideos[0]?.updated_at as string) ?? (failedVideos[0]?.created_at as string) ?? new Date().toISOString(),
      });
    }

    // Sort by lastSeen desc
    entries.sort((a, b) => (a.lastSeen > b.lastSeen ? -1 : 1));

    return {
      entries: entries.slice(0, limit),
      summary: {
        errors: entries.filter((e) => e.level === 'error').length,
        warnings: entries.filter((e) => e.level === 'warning').length,
        total: entries.length,
      },
    };
  }

  // ─── Credit usage ────────────────────────────────────────────────────────

  async getCreditUsageStats() {
    const { data } = await this.db
      .from('credit_transactions')
      .select('amount, created_at')
      .lt('amount', 0);

    const totalUsed = (data ?? []).reduce((s, t) => s + Math.abs((t.amount as number | null) ?? 0), 0);
    return { totalCreditsUsed: totalUsed, totalTransactions: (data ?? []).length };
  }
}
