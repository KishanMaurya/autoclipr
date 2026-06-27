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
