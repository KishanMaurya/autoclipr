import { Injectable } from '@nestjs/common';
import { AdminRepository } from './admin.repository';

function fmtBytes(bytes: number) {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9)  return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6)  return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${bytes} B`;
}

@Injectable()
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  async getExecutiveDashboard() {
    const [
      userCounts,
      userGrowth,
      recentUsers,
      revenue,
      recentTx,
      subscriptions,
      videoStats,
      clipStats,
      affiliateStats,
      creditStats,
      onlineUsers,
    ] = await Promise.all([
      this.repo.getUserCounts(),
      this.repo.getUserGrowthByMonth(),
      this.repo.getRecentUsers(8),
      this.repo.getRevenueSummary(),
      this.repo.getRecentTransactions(8),
      this.repo.getSubscriptionStats(),
      this.repo.getVideoStats(),
      this.repo.getClipStats(),
      this.repo.getAffiliateStats(),
      this.repo.getCreditUsageStats(),
      this.repo.getOnlineUsers(),
    ]);

    const freeUsers = userCounts.total - userCounts.paid;
    const conversionRate = userCounts.total > 0
      ? ((userCounts.paid / userCounts.total) * 100).toFixed(2)
      : '0.00';

    // MRR estimate: monthly paise from last 30 days
    const mrrRupees = Math.round(revenue.monthlyPaise / 100);
    const arrRupees = mrrRupees * 12;

    // Avg revenue per paid user
    const arpuRupees = userCounts.paid > 0
      ? Math.round(revenue.totalPaise / 100 / userCounts.paid)
      : 0;

    // Storage
    const storageFormatted = fmtBytes(videoStats.totalBytes);

    // AI usage mock (we don't track per-feature yet)
    const aiMock = {
      hooksGenerated: Math.round(clipStats.total * 0.81),
      titlesGenerated: Math.round(clipStats.total * 0.55),
      captionsGenerated: Math.round(clipStats.total * 1.43),
      scriptsGenerated: Math.round(clipStats.total * 0.12),
      creditsConsumed: creditStats.totalCreditsUsed,
    };

    // Country mock
    const countryMock = [
      { country: '🇮🇳 India',   users: Math.round(userCounts.total * 0.28), revenueRupees: Math.round(mrrRupees * 0.22) },
      { country: '🇺🇸 USA',     users: Math.round(userCounts.total * 0.22), revenueRupees: Math.round(mrrRupees * 0.34) },
      { country: '🇬🇧 UK',      users: Math.round(userCounts.total * 0.09), revenueRupees: Math.round(mrrRupees * 0.12) },
      { country: '🇨🇦 Canada',  users: Math.round(userCounts.total * 0.07), revenueRupees: Math.round(mrrRupees * 0.09) },
      { country: '🇩🇪 Germany', users: Math.round(userCounts.total * 0.05), revenueRupees: Math.round(mrrRupees * 0.06) },
    ];

    // Funnel mock
    const funnelMock = [
      { stage: 'Visitors',    value: Math.round(userCounts.total * 9.6) },
      { stage: 'Signups',     value: userCounts.total },
      { stage: 'Uploaded',    value: Math.round(userCounts.total * 0.66) },
      { stage: 'First Clip',  value: Math.round(userCounts.total * 0.49) },
      { stage: 'Paid',        value: userCounts.paid },
    ];

    // System mock
    const systemMock = {
      cpuPercent: 31,
      memoryPercent: 62,
      queueSize: 124,
      processingJobs: 18,
      failedJobs: 3,
      avgProcessingMs: 132000,
    };

    // Revenue by month chart data
    const revenueByMonth = Object.entries(revenue.byMonth).map(([month, paise]) => ({
      month,
      revenue: Math.round((paise as number) / 100),
    }));

    return {
      users: {
        total: userCounts.total,
        paid: userCounts.paid,
        free: freeUsers,
        conversionRate,
        newToday: userCounts.today,
        online: onlineUsers,
        growth: userGrowth,
        recent: recentUsers,
      },
      revenue: {
        mrrRupees,
        arrRupees,
        totalRupees: Math.round(revenue.totalPaise / 100),
        transactionCount: revenue.transactionCount,
        arpuRupees,
        byMonth: revenueByMonth,
        byPlan: revenue.byPlan,
        recent: recentTx,
      },
      subscriptions: {
        active: subscriptions.active,
        cancelled: subscriptions.cancelled,
        byPlan: subscriptions.byPlan,
        churnRate: 3.8,   // mock
        renewalRate: 94,  // mock
        refundRate: 0.9,  // mock
      },
      videos: {
        total: videoStats.total,
        today: videoStats.today,
        avgDurationSecs: videoStats.avgDurationSecs,
        storageFormatted,
        storagePct: 18.2, // mock TB out of 100
      },
      clips: {
        total: clipStats.total,
        today: clipStats.today,
        avgPerVideo: videoStats.total > 0 ? +(clipStats.total / videoStats.total).toFixed(1) : 0,
      },
      ai: aiMock,
      affiliates: affiliateStats,
      countries: countryMock,
      funnel: funnelMock,
      system: systemMock,
    };
  }
}
