import { AdminRepository } from './admin.repository';
import { createMockSupabaseClient, mockQueryBuilder, mockSupabaseAdminService } from '../../test-utils/supabase-mock';

describe('AdminRepository', () => {
  let client: ReturnType<typeof createMockSupabaseClient>;
  let repo: AdminRepository;

  beforeEach(() => {
    client = createMockSupabaseClient();
    repo = new AdminRepository(mockSupabaseAdminService(client) as any);
  });

  describe('getOnlineUsers', () => {
    it('returns the count when present', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null, error: null, count: 7 }));
      await expect(repo.getOnlineUsers()).resolves.toBe(7);
      expect(client.from).toHaveBeenCalledWith('profiles');
    });

    it('defaults to 0 when count is null', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null, error: null, count: null }));
      await expect(repo.getOnlineUsers()).resolves.toBe(0);
    });
  });

  describe('getUserCounts', () => {
    it('aggregates total, paid and today counts', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: 100 }))
        .mockReturnValueOnce(mockQueryBuilder({ count: 20 }))
        .mockReturnValueOnce(mockQueryBuilder({ count: 3 }));

      await expect(repo.getUserCounts()).resolves.toEqual({ total: 100, paid: 20, today: 3 });
    });

    it('defaults every field to 0 when counts are null', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: null }))
        .mockReturnValueOnce(mockQueryBuilder({ count: null }))
        .mockReturnValueOnce(mockQueryBuilder({ count: null }));

      await expect(repo.getUserCounts()).resolves.toEqual({ total: 0, paid: 0, today: 0 });
    });
  });

  describe('getUserGrowthByMonth', () => {
    it('buckets users by month and flags paid tiers', async () => {
      client.from.mockReturnValueOnce(
        mockQueryBuilder({
          data: [
            { created_at: '2026-01-05T00:00:00Z', subscription_tier: 'creator' },
            { created_at: '2026-01-20T00:00:00Z', subscription_tier: 'free' },
            { created_at: '2026-02-01T00:00:00Z', subscription_tier: 'starter' },
            { created_at: '2026-02-15T00:00:00Z', subscription_tier: null },
          ],
        }),
      );

      const result = await repo.getUserGrowthByMonth();
      expect(result).toEqual([
        { month: 'Jan 26', total: 2, paid: 1 },
        { month: 'Feb 26', total: 2, paid: 0 },
      ]);
    });

    it('returns an empty array when there is no data', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getUserGrowthByMonth()).resolves.toEqual([]);
    });
  });

  describe('getRecentUsers', () => {
    it('returns rows from the query', async () => {
      const rows = [{ id: '1', email: 'a@b.com' }];
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: rows }));
      await expect(repo.getRecentUsers(5)).resolves.toEqual(rows);
    });

    it('returns an empty array when data is null', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getRecentUsers()).resolves.toEqual([]);
    });
  });

  describe('getRevenueSummary', () => {
    it('parses varied amount formats and aggregates totals/monthly/byMonth/byPlan', async () => {
      const recentIso = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const oldIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      client.from.mockReturnValueOnce(
        mockQueryBuilder({
          data: [
            { amount: '₹1,999.00', billing_period: 'monthly', payment_date: recentIso, plan_id: 'creator' },
            { amount: '$25', billing_period: 'monthly', payment_date: oldIso, plan_id: 'business' },
            { amount: 'Free', billing_period: 'monthly', payment_date: recentIso, plan_id: 'starter' },
            { amount: null, billing_period: 'monthly', payment_date: null, plan_id: null },
            { amount: 'garbage', billing_period: 'monthly', payment_date: recentIso, plan_id: 'creator' },
          ],
        }),
      );

      const result = await repo.getRevenueSummary();
      // 1999.00 -> 199900 paise, 25 -> 2500 paise, Free -> 0, null -> 0, garbage -> 0
      expect(result.totalPaise).toBe(199900 + 2500);
      expect(result.monthlyPaise).toBe(199900); // only the recent, non-null payment_date txn contributes
      expect(result.transactionCount).toBe(5);
      expect(result.byPlan).toEqual({ creator: 199900, business: 2500, starter: 0, unknown: 0 });
      expect(Object.values(result.byMonth).reduce((a, b) => a + b, 0)).toBe(199900 + 2500);
    });

    it('handles an empty transaction set', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      const result = await repo.getRevenueSummary();
      expect(result).toEqual({ totalPaise: 0, monthlyPaise: 0, byMonth: {}, byPlan: {}, transactionCount: 0 });
    });
  });

  describe('getRecentTransactions', () => {
    it('returns transaction rows', async () => {
      const rows = [{ id: 'tx1' }];
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: rows }));
      await expect(repo.getRecentTransactions(3)).resolves.toEqual(rows);
    });

    it('returns an empty array when null', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getRecentTransactions()).resolves.toEqual([]);
    });
  });

  describe('getSubscriptionStats', () => {
    it('counts active/cancelled and groups active by plan', async () => {
      client.from.mockReturnValueOnce(
        mockQueryBuilder({
          data: [
            { status: 'active', plan_id: 'creator' },
            { status: 'active', plan_id: 'creator' },
            { status: 'active', plan_id: null },
            { status: 'cancelled', plan_id: 'business' },
          ],
        }),
      );

      await expect(repo.getSubscriptionStats()).resolves.toEqual({
        active: 3,
        cancelled: 1,
        byPlan: { creator: 2, unknown: 1 },
      });
    });

    it('handles null data', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getSubscriptionStats()).resolves.toEqual({ active: 0, cancelled: 0, byPlan: {} });
    });
  });

  describe('getVideoDeletionStats', () => {
    it('returns totals, today, and the split by reason', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: 40 }))  // total
        .mockReturnValueOnce(mockQueryBuilder({ count: 6 }))   // today
        .mockReturnValueOnce(mockQueryBuilder({ count: 25 })); // retention

      const result = await repo.getVideoDeletionStats();

      expect(client.from).toHaveBeenCalledWith('video_deletions');
      // byUser is derived, since anything not tagged 'retention' was the owner.
      expect(result).toEqual({ total: 40, today: 6, byRetention: 25, byUser: 15 });
    });

    it('treats null counts as zero', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: null }))
        .mockReturnValueOnce(mockQueryBuilder({ count: null }))
        .mockReturnValueOnce(mockQueryBuilder({ count: null }));

      await expect(repo.getVideoDeletionStats()).resolves.toEqual({
        total: 0, today: 0, byRetention: 0, byUser: 0,
      });
    });

    it('never reports a negative user count when retention exceeds the total', async () => {
      // Shouldn't happen, but a clamped 0 beats a nonsense negative on a dashboard.
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: 5 }))
        .mockReturnValueOnce(mockQueryBuilder({ count: 0 }))
        .mockReturnValueOnce(mockQueryBuilder({ count: 9 }));

      const result = await repo.getVideoDeletionStats();

      expect(result.byUser).toBe(0);
    });
  });

  describe('getVideoStats', () => {
    it('computes totals, byte sum and average duration', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: 50 }))
        .mockReturnValueOnce(mockQueryBuilder({ count: 4 }))
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { file_size_bytes: 1000, duration_seconds: 60 },
              { file_size_bytes: 2000, duration_seconds: 120 },
            ],
          }),
        );

      await expect(repo.getVideoStats()).resolves.toEqual({
        total: 50,
        today: 4,
        totalBytes: 3000,
        avgDurationSecs: 90,
      });
    });

    it('defaults avgDurationSecs to 0 with no sized videos', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: null }))
        .mockReturnValueOnce(mockQueryBuilder({ count: null }))
        .mockReturnValueOnce(mockQueryBuilder({ data: null }));

      await expect(repo.getVideoStats()).resolves.toEqual({
        total: 0,
        today: 0,
        totalBytes: 0,
        avgDurationSecs: 0,
      });
    });
  });

  describe('getClipStats', () => {
    it('returns total and today counts', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: 10 }))
        .mockReturnValueOnce(mockQueryBuilder({ count: 2 }));
      await expect(repo.getClipStats()).resolves.toEqual({ total: 10, today: 2 });
    });

    it('defaults to 0 on null counts', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ count: null }))
        .mockReturnValueOnce(mockQueryBuilder({ count: null }));
      await expect(repo.getClipStats()).resolves.toEqual({ total: 0, today: 0 });
    });
  });

  describe('getClipsByUser', () => {
    it('groups clips by user, sorts desc and joins profile info', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ user_id: 'u1' }, { user_id: 'u1' }, { user_id: 'u2' }],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'u1', email: 'a@b.com', full_name: 'A', subscription_tier: 'creator' }],
          }),
        );

      const result = await repo.getClipsByUser(50);
      expect(result).toEqual([
        { userId: 'u1', email: 'a@b.com', fullName: 'A', subscriptionTier: 'creator', clipCount: 2 },
        { userId: 'u2', email: 'Unknown', fullName: null, subscriptionTier: 'free', clipCount: 1 },
      ]);
    });

    it('returns an empty array immediately when there are no clips', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: [] }));
      await expect(repo.getClipsByUser()).resolves.toEqual([]);
      expect(client.from).toHaveBeenCalledTimes(1); // never queried profiles
    });

    it('respects the limit by slicing the top N users', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u2' }],
          }),
        )
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getClipsByUser(1);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('u2');
    });
  });

  describe('getAffiliateStats', () => {
    it('aggregates totals and top 5, falling back to ref_code for missing email', async () => {
      client.from.mockReturnValueOnce(
        mockQueryBuilder({
          data: [
            {
              id: 'a1',
              status: 'active',
              total_referrals: 5,
              total_conversions: 3,
              total_earnings_paise: 1000,
              email: null,
              ref_code: 'ref1',
            },
            {
              id: 'a2',
              status: 'pending',
              total_referrals: 1,
              total_conversions: 0,
              total_earnings_paise: 0,
              email: 'x@y.com',
              ref_code: 'ref2',
            },
          ],
        }),
      );

      const result = await repo.getAffiliateStats();
      expect(result.total).toBe(2);
      expect(result.active).toBe(1);
      expect(result.totalReferrals).toBe(6);
      expect(result.totalRevenuePaise).toBe(1000);
      expect(result.top).toEqual([
        { email: 'ref1', conversions: 3, earningsPaise: 1000 },
        { email: 'x@y.com', conversions: 0, earningsPaise: 0 },
      ]);
    });

    it('handles an empty affiliate list', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getAffiliateStats()).resolves.toEqual({
        total: 0,
        active: 0,
        totalReferrals: 0,
        totalRevenuePaise: 0,
        top: [],
      });
    });
  });

  describe('getAuditLogs', () => {
    it('merges every source into sorted entries with correct category/severity', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 's1', email: 'u@x.com', full_name: 'U', subscription_tier: 'creator', created_at: '2026-01-05T00:00:00Z' }],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'v1', user_id: 'u1', title: 'Vid', status: 'ready', created_at: '2026-01-04T00:00:00Z' },
              { id: 'v2', user_id: 'u1', title: null, status: 'failed', created_at: '2026-01-03T00:00:00Z' },
            ],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'b1', user_id: 'u1', plan_id: 'creator', amount: '₹399', status: 'paid', payment_date: '2026-01-06T00:00:00Z', created_at: '2026-01-06T00:00:00Z' }],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'p1', user_id: 'u1', platform: 'youtube', status: 'posted', error_message: null, created_at: '2026-01-07T00:00:00Z' },
              { id: 'p2', user_id: 'u1', platform: 'youtube', status: 'failed', error_message: 'oops', created_at: '2026-01-02T00:00:00Z' },
              { id: 'p3', user_id: 'u1', platform: 'tiktok', status: 'queued', error_message: null, created_at: '2026-01-01T00:00:00Z' },
            ],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'c1', user_id: 'u1', channel_name: 'Chan', channel_url: 'https://yt', created_at: '2026-01-08T00:00:00Z' }],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'conn1', user_id: 'u1', platform: 'instagram', account_name: null, auth_status: 'ok', created_at: '2026-01-09T00:00:00Z' }],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'j1', user_id: 'u1', job_type: 'render', status: 'failed', error_message: 'boom', created_at: '2026-01-10T00:00:00Z' }],
          }),
        );

      const result = await repo.getAuditLogs(100, 30);
      expect(result.total).toBe(10);
      expect(result.entries).toHaveLength(10);
      // Sorted descending by timestamp -> the failed job (2026-01-10) should be first
      expect(result.entries[0].id).toBe('job-j1');
      expect(result.entries[0].severity).toBe('error');

      const videoFailed = result.entries.find((e) => e.id === 'video-v2')!;
      expect(videoFailed.action).toBe('Video failed');
      expect(videoFailed.severity).toBe('error');
      expect(videoFailed.detail).toBe('Untitled');

      const videoReady = result.entries.find((e) => e.id === 'video-v1')!;
      expect(videoReady.action).toBe('Video uploaded');
      expect(videoReady.severity).toBe('info');

      const pubPosted = result.entries.find((e) => e.id === 'pub-p1')!;
      expect(pubPosted.action).toBe('Clip published');
      expect(pubPosted.severity).toBe('success');
      expect(pubPosted.detail).toBe('Platform: youtube');

      const pubFailed = result.entries.find((e) => e.id === 'pub-p2')!;
      expect(pubFailed.action).toBe('Clip publish failed');
      expect(pubFailed.severity).toBe('error');
      expect(pubFailed.detail).toBe('Platform: youtube · oops');

      const pubQueued = result.entries.find((e) => e.id === 'pub-p3')!;
      expect(pubQueued.action).toBe('Clip queued for publish');
      expect(pubQueued.severity).toBe('info');

      const conn = result.entries.find((e) => e.id === 'conn-conn1')!;
      expect(conn.action).toBe('instagram account connected');
      expect(conn.detail).toBe('auth: ok');

      const job = result.entries.find((e) => e.id === 'job-j1')!;
      expect(job.action).toBe('Job failed: render');
      expect(job.detail).toBe('boom');
    });

    it('caps entries at the requested limit and handles all-null sources', async () => {
      for (let i = 0; i < 7; i++) {
        client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      }
      const result = await repo.getAuditLogs(5, 7);
      expect(result).toEqual({ entries: [], total: 0 });
    });

    it('falls back to created_at when a billing payment_date is missing and defaults error/job messages', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: [] })) // signups
        .mockReturnValueOnce(mockQueryBuilder({ data: [] })) // videos
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'b2', user_id: 'u1', plan_id: 'business', amount: '₹1999', status: 'paid', payment_date: null, created_at: '2026-01-11T00:00:00Z' }],
          }),
        ) // billing
        .mockReturnValueOnce(mockQueryBuilder({ data: [] })) // publications
        .mockReturnValueOnce(mockQueryBuilder({ data: [] })) // channels
        .mockReturnValueOnce(mockQueryBuilder({ data: [] })) // connections
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'j2', user_id: 'u1', job_type: 'render', status: 'failed', error_message: null, created_at: '2026-01-12T00:00:00Z' }],
          }),
        ); // failed jobs

      const result = await repo.getAuditLogs(100, 30);
      const billing = result.entries.find((e) => e.id === 'billing-b2')!;
      expect(billing.ts).toBe('2026-01-11T00:00:00Z');
      const job = result.entries.find((e) => e.id === 'job-j2')!;
      expect(job.detail).toBe('No error message');
    });
  });

  describe('getAnalytics', () => {
    it('builds day buckets, status distributions and average viral score', async () => {
      const today = new Date().toISOString().slice(0, 10);
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ created_at: `${today}T01:00:00Z` }] })) // signups
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ created_at: `${today}T01:00:00Z`, status: 'ready' }] })) // videos
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { created_at: `${today}T01:00:00Z`, status: 'completed', ai_score: 0.5 },
              { created_at: `${today}T02:00:00Z`, status: 'completed', ai_score: null },
            ],
          }),
        ) // clips
        .mockReturnValueOnce(
          mockQueryBuilder({ data: [{ created_at: `${today}T01:00:00Z`, status: 'failed', job_type: 'render' }] }),
        ) // jobs
        .mockReturnValueOnce(
          mockQueryBuilder({ data: [{ created_at: `${today}T01:00:00Z`, status: 'posted', platform: 'youtube' }] }),
        ); // publications

      const result = await repo.getAnalytics(3);
      expect(result.days).toBe(3);
      expect(result.signupsByDay).toHaveLength(3);
      expect(result.signupsByDay[2].value).toBe(1); // today is last bucket
      expect(result.clipStatus).toEqual([{ name: 'completed', value: 2 }]);
      expect(result.videoStatus).toEqual([{ name: 'ready', value: 1 }]);
      expect(result.jobTypes).toEqual([{ name: 'render', value: 1 }]);
      expect(result.jobStatus).toEqual([{ name: 'failed', value: 1 }]);
      expect(result.publications).toEqual([{ name: 'youtube', value: 1 }]);
      expect(result.pubStatus).toEqual([{ name: 'posted', value: 1 }]);
      expect(result.avgViralScore).toBe(50);
      expect(result.totals).toEqual({ signups: 1, videos: 1, clips: 2, jobs: 1, pubs: 1 });
    });

    it('returns null avgViralScore when no clips have a score', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getAnalytics(30);
      expect(result.avgViralScore).toBeNull();
      expect(result.clipStatus).toEqual([]);
    });

    it('falls back to "unknown" status labels when status is missing', async () => {
      const today = new Date().toISOString().slice(0, 10);
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ created_at: `${today}T00:00:00Z`, status: null }] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ created_at: `${today}T00:00:00Z`, status: null, ai_score: null }] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ created_at: `${today}T00:00:00Z`, status: null, job_type: null }] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ created_at: `${today}T00:00:00Z`, status: null, platform: null }] }));

      const result = await repo.getAnalytics(1);
      expect(result.videoStatus).toEqual([{ name: 'unknown', value: 1 }]);
      expect(result.clipStatus).toEqual([{ name: 'unknown', value: 1 }]);
      expect(result.jobTypes).toEqual([{ name: 'unknown', value: 1 }]);
      expect(result.publications).toEqual([{ name: 'unknown', value: 1 }]);
    });
  });

  describe('getTopCreators', () => {
    it('returns an empty array when there are no connected channels', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: [] }));
      await expect(repo.getTopCreators()).resolves.toEqual([]);
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getTopCreators()).resolves.toEqual([]);
    });

    it('joins profile/video/clip counts and sorts by clip count desc', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'ch1', user_id: 'u1', channel_name: 'C1', channel_url: 'url1', thumbnail_url: null, is_trial_channel: false, created_at: '2026-01-01' },
              { id: 'ch2', user_id: 'u2', channel_name: 'C2', channel_url: 'url2', thumbnail_url: 'thumb', is_trial_channel: true, created_at: '2026-01-02' },
            ],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({ data: [{ id: 'u1', email: 'u1@x.com', subscription_tier: 'creator', credits: 10 }] }),
        )
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u2' }] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ user_id: 'u2' }, { user_id: 'u2' }, { user_id: 'u2' }] }));

      const result = await repo.getTopCreators(10);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('ch2'); // higher clip count first
      expect(result[0]).toEqual({
        id: 'ch2',
        channelName: 'C2',
        channelUrl: 'url2',
        thumbnailUrl: 'thumb',
        isTrial: true,
        connectedAt: '2026-01-02',
        userEmail: null,
        tier: 'free',
        credits: 0,
        videoCount: 2,
        clipCount: 3,
      });
      expect(result[1]).toEqual({
        id: 'ch1',
        channelName: 'C1',
        channelUrl: 'url1',
        thumbnailUrl: null,
        isTrial: false,
        connectedAt: '2026-01-01',
        userEmail: 'u1@x.com',
        tier: 'creator',
        credits: 10,
        videoCount: 1,
        clipCount: 0,
      });
    });

    it('respects the limit parameter', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'ch1', user_id: 'u1', channel_name: 'C1', channel_url: 'url1', thumbnail_url: null, is_trial_channel: false, created_at: '2026-01-01' },
              { id: 'ch2', user_id: 'u2', channel_name: 'C2', channel_url: 'url2', thumbnail_url: null, is_trial_channel: false, created_at: '2026-01-02' },
            ],
          }),
        )
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getTopCreators(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('getRecentErrors', () => {
    it('groups repeated job/publication errors and includes stuck-video summary', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'j1', job_type: 'render', error_message: 'timeout', attempts: 1, created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:00:00Z' },
              { id: 'j2', job_type: 'render', error_message: 'timeout', attempts: 2, created_at: '2026-01-02T00:00:00Z', completed_at: '2026-01-02T00:00:00Z' },
            ],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'p1', platform: 'youtube', error_message: 'quota', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
            ],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'v1', title: 'Vid', status: 'failed', created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' },
            ],
          }),
        );

      const result = await repo.getRecentErrors(50);
      expect(result.summary.total).toBe(3); // 1 grouped job error + 1 pub error + 1 stuck-video summary
      expect(result.summary.errors).toBe(1);
      expect(result.summary.warnings).toBe(2);

      const jobError = result.entries.find((e) => e.service === 'render')!;
      expect(jobError.count).toBe(2);
      expect(jobError.message).toBe('timeout');
      expect(jobError.lastSeen).toBe('2026-01-02T00:00:00Z');

      const pubError = result.entries.find((e) => e.service === 'publishing')!;
      expect(pubError.message).toBe('[youtube] quota');

      const stuckVideos = result.entries.find((e) => e.id === 'failed-videos')!;
      expect(stuckVideos.message).toBe('1 video(s) stuck in failed status');
      expect(stuckVideos.service).toBe('video-processor');
    });

    it('returns empty entries and zeroed summary when nothing failed', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getRecentErrors();
      expect(result).toEqual({ entries: [], summary: { errors: 0, warnings: 0, total: 0 } });
    });

    it('does not select updated_at from processing_jobs — that column does not exist', async () => {
      // Regression: selecting a non-existent column made Postgres reject the
      // whole query (42703), and because the result is read as `data ?? []`
      // every worker error silently disappeared from the admin page.
      const jobsBuilder = mockQueryBuilder({ data: [] });
      client.from
        .mockReturnValueOnce(jobsBuilder)
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      await repo.getRecentErrors();

      const selected = jobsBuilder.select.mock.calls[0][0] as string;
      expect(selected).not.toContain('updated_at');
      expect(selected).toContain('completed_at');
    });

    it('uses completed_at as the failure timestamp for jobs', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              {
                id: 'j1',
                job_type: 'render',
                error_message: 'timeout',
                attempts: 1,
                created_at: '2026-01-01T00:00:00Z',
                completed_at: '2026-01-09T00:00:00Z',
              },
            ],
          }),
        )
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getRecentErrors();

      expect(result.entries[0].lastSeen).toBe('2026-01-09T00:00:00Z');
    });

    it('falls back to created_at when a job has no completed_at', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              {
                id: 'j1',
                job_type: 'render',
                error_message: 'timeout',
                attempts: 1,
                created_at: '2026-01-01T00:00:00Z',
                completed_at: null,
              },
            ],
          }),
        )
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getRecentErrors();

      expect(result.entries[0].lastSeen).toBe('2026-01-01T00:00:00Z');
    });

    it('logs each failing source query instead of silently dropping its results', async () => {
      const logSpy = jest
        .spyOn(require('@nestjs/common').Logger.prototype, 'error')
        .mockImplementation();
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: null, error: { message: 'boom-jobs' } }))
        .mockReturnValueOnce(mockQueryBuilder({ data: null, error: { message: 'boom-pubs' } }))
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getRecentErrors();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('processing_jobs'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('boom-jobs'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('clip_publications'));
      // Still degrades gracefully rather than blanking the page.
      expect(result.summary.total).toBe(0);

      logSpy.mockRestore();
    });

    it('increments the count without replacing lastSeen when a later duplicate arrives out of order', async () => {
      // Third occurrence has an *older* timestamp than the second, so the `else` branch
      // (count++ without updating lastSeen) must run for both job and publication grouping.
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'j1', job_type: 'render', error_message: 'timeout', attempts: 1, created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:00:00Z' },
              { id: 'j2', job_type: 'render', error_message: 'timeout', attempts: 2, created_at: '2026-01-05T00:00:00Z', completed_at: '2026-01-05T00:00:00Z' },
              { id: 'j3', job_type: 'render', error_message: 'timeout', attempts: 3, created_at: '2026-01-02T00:00:00Z', completed_at: '2026-01-02T00:00:00Z' },
            ],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [
              { id: 'p1', platform: 'youtube', error_message: 'quota', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
              { id: 'p2', platform: 'youtube', error_message: 'quota', created_at: '2026-01-05T00:00:00Z', updated_at: '2026-01-05T00:00:00Z' },
              { id: 'p3', platform: 'youtube', error_message: 'quota', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
            ],
          }),
        )
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getRecentErrors(50);

      const jobError = result.entries.find((e) => e.service === 'render')!;
      expect(jobError.count).toBe(3);
      expect(jobError.lastSeen).toBe('2026-01-05T00:00:00Z'); // unchanged by the older 3rd occurrence

      const pubError = result.entries.find((e) => e.service === 'publishing')!;
      expect(pubError.count).toBe(3);
      expect(pubError.lastSeen).toBe('2026-01-05T00:00:00Z');
    });

    it('defaults missing error messages and job_type/service labels', async () => {
      client.from
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'j3', job_type: null, error_message: null, attempts: 1, created_at: '2026-01-01T00:00:00Z', updated_at: null }],
          }),
        )
        .mockReturnValueOnce(
          mockQueryBuilder({
            data: [{ id: 'p2', platform: null, error_message: null, created_at: '2026-01-01T00:00:00Z', updated_at: null }],
          }),
        )
        .mockReturnValueOnce(mockQueryBuilder({ data: [] }));

      const result = await repo.getRecentErrors();
      const jobError = result.entries.find((e) => e.id === 'j3')!;
      expect(jobError.message).toBe('Unknown error');
      expect(jobError.service).toBe('worker');

      const pubError = result.entries.find((e) => e.id === 'p2')!;
      expect(pubError.message).toBe('[platform] Publish failed');
    });
  });

  describe('getCreditUsageStats', () => {
    it('sums the absolute value of negative credit transactions', async () => {
      client.from.mockReturnValueOnce(
        mockQueryBuilder({ data: [{ amount: -5 }, { amount: -10 }, { amount: null }] }),
      );
      await expect(repo.getCreditUsageStats()).resolves.toEqual({ totalCreditsUsed: 15, totalTransactions: 3 });
    });

    it('returns 0/0 when there are no transactions', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getCreditUsageStats()).resolves.toEqual({ totalCreditsUsed: 0, totalTransactions: 0 });
    });
  });
});
