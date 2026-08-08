import { AffiliatesRepository } from './affiliates.repository';
import { createMockSupabaseClient, mockQueryBuilder, mockSupabaseAdminService } from '../../test-utils/supabase-mock';

describe('AffiliatesRepository', () => {
  let client: ReturnType<typeof createMockSupabaseClient>;
  let repo: AffiliatesRepository;

  beforeEach(() => {
    client = createMockSupabaseClient();
    repo = new AffiliatesRepository(mockSupabaseAdminService(client) as any);
  });

  describe('findByUserId', () => {
    it('returns the affiliate when found', async () => {
      const affiliate = { id: 'a1', user_id: 'u1' };
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: affiliate }));
      await expect(repo.findByUserId('u1')).resolves.toEqual(affiliate);
      expect(client.from).toHaveBeenCalledWith('affiliates');
    });

    it('returns null when not found', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.findByUserId('u1')).resolves.toBeNull();
    });
  });

  describe('findByRefCode', () => {
    it('returns the active affiliate when found', async () => {
      const affiliate = { id: 'a1', ref_code: 'abc123', status: 'active' };
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: affiliate }));
      await expect(repo.findByRefCode('abc123')).resolves.toEqual(affiliate);
    });

    it('returns null when not found / not active', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.findByRefCode('missing')).resolves.toBeNull();
    });
  });

  describe('create', () => {
    it('creates and returns the affiliate row', async () => {
      const created = { id: 'a1', user_id: 'u1', ref_code: 'abc' };
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: created, error: null }));
      await expect(repo.create('u1', 'abc', 'a@b.com', 'https://yt')).resolves.toEqual(created);
    });

    it('throws when supabase returns an error', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null, error: { message: 'insert failed' } }));
      await expect(repo.create('u1', 'abc', 'a@b.com', 'https://yt')).rejects.toThrow(
        'Failed to create affiliate: insert failed',
      );
    });
  });

  describe('incrementClicks', () => {
    it('calls the increment RPC with the affiliate id', async () => {
      await repo.incrementClicks('a1');
      expect(client.rpc).toHaveBeenCalledWith('increment_affiliate_clicks', { aff_id: 'a1' });
    });
  });

  describe('trackReferral', () => {
    it('returns null when the user was already tracked (idempotent)', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: { id: 'existing-ref' } }));
      const result = await repo.trackReferral('a1', 'u1');
      expect(result).toBeNull();
      expect(client.from).toHaveBeenCalledTimes(1); // never proceeded to insert
    });

    it('creates a referral, increments counters and stamps referred_by', async () => {
      const referral = { id: 'r1', affiliate_id: 'a1', referred_user_id: 'u1' };
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: null })) // existing check
        .mockReturnValueOnce(mockQueryBuilder({ data: referral, error: null })) // insert referral
        .mockReturnValueOnce(mockQueryBuilder({ data: null, error: null })); // update profile

      const result = await repo.trackReferral('a1', 'u1');
      expect(result).toEqual(referral);
      expect(client.rpc).toHaveBeenCalledWith('increment_affiliate_referrals', { aff_id: 'a1' });
      expect(client.from).toHaveBeenNthCalledWith(3, 'profiles');
    });

    it('returns null and logs a warning when the referral insert fails', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: null })) // existing check
        .mockReturnValueOnce(mockQueryBuilder({ data: null, error: { message: 'insert failed' } })); // insert referral

      const result = await repo.trackReferral('a1', 'u1');
      expect(result).toBeNull();
      expect(client.rpc).not.toHaveBeenCalled();
    });
  });

  describe('findReferralByUser', () => {
    it('returns the referral joined with affiliate', async () => {
      const row = { id: 'r1', affiliate: { id: 'a1' } };
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: row }));
      await expect(repo.findReferralByUser('u1')).resolves.toEqual(row);
    });

    it('returns null when no referral exists', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.findReferralByUser('u1')).resolves.toBeNull();
    });
  });

  describe('createCommission', () => {
    it('inserts the commission, updates earnings via RPC and marks referral converted', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ error: null })) // insert commission
        .mockReturnValueOnce(mockQueryBuilder({ error: null })) // update affiliate updated_at
        .mockReturnValueOnce(mockQueryBuilder({ error: null })); // update referral status

      await repo.createCommission('a1', 'r1', 39900, 30, 'creator', 'monthly', 'tx1');

      expect(client.rpc).toHaveBeenCalledWith('add_affiliate_earnings', { aff_id: 'a1', earned: 11970 }); // 39900*30/100
      expect(client.from).toHaveBeenNthCalledWith(1, 'affiliate_commissions');
      expect(client.from).toHaveBeenNthCalledWith(2, 'affiliates');
      expect(client.from).toHaveBeenNthCalledWith(3, 'referrals');
    });

    it('logs a warning and returns early when the commission insert fails', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ error: { message: 'boom' } }));
      await repo.createCommission('a1', 'r1', 39900, 30, 'creator', 'monthly', 'tx1');
      expect(client.rpc).not.toHaveBeenCalled();
      expect(client.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateCommissionRate', () => {
    it.each([
      [0, 30],
      [5, 30],
      [6, 35],
      [20, 35],
      [21, 40],
      [100, 40],
    ])('conversions=%i -> rate=%i', async (conversions, expectedRate) => {
      client.from.mockReturnValueOnce(mockQueryBuilder({}));
      await repo.updateCommissionRate('a1', conversions);
      const builder = client.from.mock.results[0].value;
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ commission_rate: expectedRate }),
      );
    });
  });

  describe('getReferrals / getCommissions / getPayouts', () => {
    it('getReferrals returns rows or empty array', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: [{ id: 'r1' }] }));
      await expect(repo.getReferrals('a1')).resolves.toEqual([{ id: 'r1' }]);

      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getReferrals('a1')).resolves.toEqual([]);
    });

    it('getCommissions returns rows or empty array', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: [{ id: 'c1' }] }));
      await expect(repo.getCommissions('a1')).resolves.toEqual([{ id: 'c1' }]);

      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getCommissions('a1')).resolves.toEqual([]);
    });

    it('getPayouts returns rows or empty array', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: [{ id: 'p1' }] }));
      await expect(repo.getPayouts('a1')).resolves.toEqual([{ id: 'p1' }]);

      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getPayouts('a1')).resolves.toEqual([]);
    });
  });

  describe('createPayout', () => {
    it('creates and returns the payout row', async () => {
      const payout = { id: 'p1', amount_paise: 150000, status: 'pending' };
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: payout, error: null }));
      await expect(repo.createPayout('a1', 150000, 'upi', 'user@upi')).resolves.toEqual(payout);
    });

    it('throws when supabase returns an error', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null, error: { message: 'db down' } }));
      await expect(repo.createPayout('a1', 150000, 'upi', 'user@upi')).rejects.toThrow(
        'Failed to create payout: db down',
      );
    });
  });

  describe('getProfileEmail', () => {
    it('returns the email when present', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: { email: 'a@b.com' } }));
      await expect(repo.getProfileEmail('u1')).resolves.toBe('a@b.com');
    });

    it('returns empty string when profile is missing', async () => {
      client.from.mockReturnValueOnce(mockQueryBuilder({ data: null }));
      await expect(repo.getProfileEmail('u1')).resolves.toBe('');
    });
  });
});
