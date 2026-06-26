import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

function parseAmountPaise(amount: string): number {
  // "₹4,188.00" → 418800, "Free" → 0
  if (!amount || amount === 'Free') return 0;
  const num = parseFloat(amount.replace(/[₹$,\s]/g, ''));
  return isNaN(num) ? 0 : Math.round(num * 100);
}

@Injectable()
export class AdminRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  private get db() { return this.supabase.getClient(); }

  // ─── Users ───────────────────────────────────────────────────────────────

  async getUserCounts() {
    const [{ count: total }, { count: paid }, { count: today }] = await Promise.all([
      this.db.from('profiles').select('*', { count: 'exact', head: true }),
      this.db.from('profiles').select('*', { count: 'exact', head: true })
        .not('subscription_tier', 'in', '("free","starter")'),
      this.db.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);
    return { total: total ?? 0, paid: paid ?? 0, today: today ?? 0 };
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
    (data ?? []).forEach((u) => {
      const m = new Date(u.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, total: 0, paid: 0 };
      months[m].total++;
      if (!['free', 'starter'].includes(u.subscription_tier ?? '')) months[m].paid++;
    });
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
    const totalPaise = transactions.reduce((s, t) => s + parseAmountPaise(t.amount), 0);

    // Monthly transactions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthly = transactions
      .filter((t) => t.payment_date >= thirtyDaysAgo)
      .reduce((s, t) => s + parseAmountPaise(t.amount), 0);

    // Revenue by month (last 6)
    const byMonth: Record<string, number> = {};
    transactions.forEach((t) => {
      const m = new Date(t.payment_date).toLocaleString('default', { month: 'short', year: '2-digit' });
      byMonth[m] = (byMonth[m] ?? 0) + parseAmountPaise(t.amount);
    });

    // Revenue by plan
    const byPlan: Record<string, number> = {};
    transactions.forEach((t) => {
      byPlan[t.plan_id] = (byPlan[t.plan_id] ?? 0) + parseAmountPaise(t.amount);
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

    const active = (subs ?? []).filter((s) => s.status === 'active');
    const monthly = active.filter((s) => s.plan_id?.includes('monthly') || true).length; // approximate
    const byPlan: Record<string, number> = {};
    active.forEach((s) => { byPlan[s.plan_id ?? 'unknown'] = (byPlan[s.plan_id ?? 'unknown'] ?? 0) + 1; });

    return { active: active.length, cancelled: (subs ?? []).filter((s) => s.status === 'cancelled').length, byPlan };
  }

  // ─── Videos & Clips ──────────────────────────────────────────────────────

  async getVideoStats() {
    const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    const [{ count: total }, { count: todayCount }, { data: sizeData }] = await Promise.all([
      this.db.from('videos').select('*', { count: 'exact', head: true }),
      this.db.from('videos').select('*', { count: 'exact', head: true }).gte('created_at', today),
      this.db.from('videos').select('file_size_bytes, duration_seconds').not('file_size_bytes', 'is', null),
    ]);

    const totalBytes = (sizeData ?? []).reduce((s, v) => s + (v.file_size_bytes ?? 0), 0);
    const avgDuration = (sizeData ?? []).reduce((s, v) => s + (v.duration_seconds ?? 0), 0) / Math.max(1, (sizeData ?? []).length);

    return { total: total ?? 0, today: todayCount ?? 0, totalBytes, avgDurationSecs: Math.round(avgDuration) };
  }

  async getClipStats() {
    const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    const [{ count: total }, { count: todayCount }] = await Promise.all([
      this.db.from('clips').select('*', { count: 'exact', head: true }),
      this.db.from('clips').select('*', { count: 'exact', head: true }).gte('created_at', today),
    ]);

    return { total: total ?? 0, today: todayCount ?? 0 };
  }

  // ─── Affiliates ──────────────────────────────────────────────────────────

  async getAffiliateStats() {
    const { data: affiliates } = await this.db
      .from('affiliates')
      .select('id, status, total_referrals, total_conversions, total_earnings_paise, email, ref_code')
      .order('total_conversions', { ascending: false });

    const all = affiliates ?? [];
    const active = all.filter((a) => a.status === 'active');
    const totalReferrals = all.reduce((s, a) => s + (a.total_referrals ?? 0), 0);
    const totalRevenuePaise = all.reduce((s, a) => s + (a.total_earnings_paise ?? 0), 0);
    const top = all.slice(0, 5).map((a) => ({
      email: a.email ?? a.ref_code,
      conversions: a.total_conversions ?? 0,
      earningsPaise: a.total_earnings_paise ?? 0,
    }));

    return { total: all.length, active: active.length, totalReferrals, totalRevenuePaise, top };
  }

  // ─── Top Creators ────────────────────────────────────────────────────────

  async getTopCreators(limit = 10) {
    const { data } = await this.db
      .from('profiles')
      .select(`
        id, email, full_name, avatar_url, subscription_tier,
        videos:videos(count),
        clips:clips(count)
      `)
      .not('subscription_tier', 'in', '("free","starter")')
      .limit(limit);
    return data ?? [];
  }

  // ─── Credit usage ────────────────────────────────────────────────────────

  async getCreditUsageStats() {
    const { data } = await this.db
      .from('credit_transactions')
      .select('amount, created_at')
      .lt('amount', 0); // debits only

    const totalUsed = (data ?? []).reduce((s, t) => s + Math.abs(t.amount ?? 0), 0);
    return { totalCreditsUsed: totalUsed, totalTransactions: (data ?? []).length };
  }
}
