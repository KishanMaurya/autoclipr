import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';

function makeRepo(overrides: Partial<Record<keyof AdminRepository, jest.Mock>> = {}) {
  return {
    getAuditLogs: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
    getAnalytics: jest.fn().mockResolvedValue({ days: 30 }),
    getTopCreators: jest.fn().mockResolvedValue([]),
    getClipsByUser: jest.fn().mockResolvedValue([]),
    getRecentErrors: jest.fn().mockResolvedValue({ entries: [], summary: {} }),
    getUserCounts: jest.fn().mockResolvedValue({ total: 0, paid: 0, today: 0 }),
    getUserGrowthByMonth: jest.fn().mockResolvedValue([]),
    getRecentUsers: jest.fn().mockResolvedValue([]),
    getRevenueSummary: jest.fn().mockResolvedValue({ totalPaise: 0, monthlyPaise: 0, byMonth: {}, byPlan: {}, transactionCount: 0 }),
    getRecentTransactions: jest.fn().mockResolvedValue([]),
    getSubscriptionStats: jest.fn().mockResolvedValue({ active: 0, cancelled: 0, byPlan: {} }),
    getVideoStats: jest.fn().mockResolvedValue({ total: 0, today: 0, totalBytes: 0, avgDurationSecs: 0 }),
    getVideoDeletionStats: jest.fn().mockResolvedValue({ total: 0, today: 0, byRetention: 0, byUser: 0 }),
    getClipStats: jest.fn().mockResolvedValue({ total: 0, today: 0 }),
    getAffiliateStats: jest.fn().mockResolvedValue({ total: 0, active: 0, totalReferrals: 0, totalRevenuePaise: 0, top: [] }),
    getCreditUsageStats: jest.fn().mockResolvedValue({ totalCreditsUsed: 0, totalTransactions: 0 }),
    getOnlineUsers: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as AdminRepository;
}

describe('AdminService', () => {
  describe('thin delegating methods', () => {
    it('getAuditLogs forwards limit/days and returns repo result', async () => {
      const repo = makeRepo({ getAuditLogs: jest.fn().mockResolvedValue({ entries: [{ id: '1' }], total: 1 }) });
      const service = new AdminService(repo);
      await expect(service.getAuditLogs(20, 5)).resolves.toEqual({ entries: [{ id: '1' }], total: 1 });
      expect(repo.getAuditLogs).toHaveBeenCalledWith(20, 5);
    });

    it('getAuditLogs applies defaults', async () => {
      const repo = makeRepo();
      const service = new AdminService(repo);
      await service.getAuditLogs();
      expect(repo.getAuditLogs).toHaveBeenCalledWith(100, 30);
    });

    it('getAnalytics forwards days with default', async () => {
      const repo = makeRepo();
      const service = new AdminService(repo);
      await service.getAnalytics();
      expect(repo.getAnalytics).toHaveBeenCalledWith(30);
      await service.getAnalytics(7);
      expect(repo.getAnalytics).toHaveBeenCalledWith(7);
    });

    it('getTopCreators forwards limit with default', async () => {
      const repo = makeRepo();
      const service = new AdminService(repo);
      await service.getTopCreators();
      expect(repo.getTopCreators).toHaveBeenCalledWith(50);
      await service.getTopCreators(5);
      expect(repo.getTopCreators).toHaveBeenCalledWith(5);
    });

    it('getClipsByUser forwards limit with default', async () => {
      const repo = makeRepo();
      const service = new AdminService(repo);
      await service.getClipsByUser();
      expect(repo.getClipsByUser).toHaveBeenCalledWith(50);
      await service.getClipsByUser(9);
      expect(repo.getClipsByUser).toHaveBeenCalledWith(9);
    });

    it('getErrors forwards limit with default and calls getRecentErrors', async () => {
      const repo = makeRepo();
      const service = new AdminService(repo);
      await service.getErrors();
      expect(repo.getRecentErrors).toHaveBeenCalledWith(50);
      await service.getErrors(3);
      expect(repo.getRecentErrors).toHaveBeenCalledWith(3);
    });
  });

  describe('getExecutiveDashboard', () => {
    it('composes the full dashboard payload from every repo call', async () => {
      const repo = makeRepo({
        getUserCounts: jest.fn().mockResolvedValue({ total: 100, paid: 25, today: 4 }),
        getUserGrowthByMonth: jest.fn().mockResolvedValue([{ month: 'Jan 26', total: 10, paid: 2 }]),
        getRecentUsers: jest.fn().mockResolvedValue([{ id: 'u1' }]),
        getRevenueSummary: jest.fn().mockResolvedValue({
          totalPaise: 500000,
          monthlyPaise: 199900,
          byMonth: { 'Jan 26': 199900 },
          byPlan: { creator: 199900 },
          transactionCount: 5,
        }),
        getRecentTransactions: jest.fn().mockResolvedValue([{ id: 'tx1' }]),
        getSubscriptionStats: jest.fn().mockResolvedValue({ active: 20, cancelled: 2, byPlan: { creator: 20 } }),
        getVideoStats: jest.fn().mockResolvedValue({ total: 50, today: 3, totalBytes: 2_000_000_000, avgDurationSecs: 90 }),
        getVideoDeletionStats: jest.fn().mockResolvedValue({ total: 12, today: 2, byRetention: 9, byUser: 3 }),
        getClipStats: jest.fn().mockResolvedValue({ total: 200, today: 10 }),
        getAffiliateStats: jest.fn().mockResolvedValue({ total: 3, active: 2, totalReferrals: 9, totalRevenuePaise: 1000, top: [] }),
        getCreditUsageStats: jest.fn().mockResolvedValue({ totalCreditsUsed: 500, totalTransactions: 12 }),
        getOnlineUsers: jest.fn().mockResolvedValue(6),
      });
      const service = new AdminService(repo);

      const dashboard = await service.getExecutiveDashboard();

      expect(dashboard.users).toEqual({
        total: 100,
        paid: 25,
        free: 75,
        conversionRate: '25.00',
        newToday: 4,
        online: 6,
        growth: [{ month: 'Jan 26', total: 10, paid: 2 }],
        recent: [{ id: 'u1' }],
      });

      expect(dashboard.revenue.mrrRupees).toBe(1999); // 199900 / 100
      expect(dashboard.revenue.arrRupees).toBe(1999 * 12);
      expect(dashboard.revenue.totalRupees).toBe(5000); // 500000 / 100
      expect(dashboard.revenue.arpuRupees).toBe(200); // 500000/100/25
      expect(dashboard.revenue.byMonth).toEqual([{ month: 'Jan 26', revenue: 1999 }]);
      expect(dashboard.revenue.byPlan).toEqual({ creator: 199900 });
      expect(dashboard.revenue.recent).toEqual([{ id: 'tx1' }]);

      expect(dashboard.subscriptions.active).toBe(20);
      expect(dashboard.subscriptions.cancelled).toBe(2);

      expect(dashboard.videos.storageFormatted).toBe('2.0 GB');
      expect(dashboard.clips.avgPerVideo).toBe(4); // 200/50

      expect(dashboard.ai.creditsConsumed).toBe(500);
      expect(dashboard.affiliates).toEqual({ total: 3, active: 2, totalReferrals: 9, totalRevenuePaise: 1000, top: [] });
      expect(dashboard.countries).toHaveLength(5);
      expect(dashboard.funnel).toHaveLength(5);
      expect(dashboard.system).toBeDefined();
    });

    it('avoids divide-by-zero: 0 users -> 0.00 conversion, 0 paid users -> 0 arpu, 0 videos -> 0 avgPerVideo', async () => {
      const repo = makeRepo({
        getUserCounts: jest.fn().mockResolvedValue({ total: 0, paid: 0, today: 0 }),
        getVideoStats: jest.fn().mockResolvedValue({ total: 0, today: 0, totalBytes: 0, avgDurationSecs: 0 }),
        getVideoDeletionStats: jest.fn().mockResolvedValue({ total: 0, today: 0, byRetention: 0, byUser: 0 }),
        getClipStats: jest.fn().mockResolvedValue({ total: 0, today: 0 }),
      });
      const service = new AdminService(repo);

      const dashboard = await service.getExecutiveDashboard();
      expect(dashboard.users.conversionRate).toBe('0.00');
      expect(dashboard.revenue.arpuRupees).toBe(0);
      expect(dashboard.clips.avgPerVideo).toBe(0);
      expect(dashboard.videos.storageFormatted).toBe('0 B');
    });

    it('formats storage sizes across every magnitude', async () => {
      const cases: [number, string][] = [
        [500, '500 B'],
        [5_000_000, '5.0 MB'],
        [5_000_000_000, '5.0 GB'],
        [5_000_000_000_000, '5.0 TB'],
      ];

      for (const [bytes, expected] of cases) {
        const repo = makeRepo({
          getVideoStats: jest.fn().mockResolvedValue({ total: 1, today: 0, totalBytes: bytes, avgDurationSecs: 0 }),
          getVideoDeletionStats: jest.fn().mockResolvedValue({ total: 0, today: 0, byRetention: 0, byUser: 0 }),
        });
        const service = new AdminService(repo);
        const dashboard = await service.getExecutiveDashboard();
        expect(dashboard.videos.storageFormatted).toBe(expected);
      }
    });
  });
});
