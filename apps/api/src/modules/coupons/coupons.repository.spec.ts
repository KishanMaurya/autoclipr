import { Test } from '@nestjs/testing';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { CouponsRepository } from './coupons.repository';
import {
  createMockSupabaseClient,
  mockQueryBuilder,
  mockSupabaseAdminService,
} from '../../test-utils/supabase-mock';

describe('CouponsRepository', () => {
  let repo: CouponsRepository;
  let client: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    client = createMockSupabaseClient();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CouponsRepository,
        { provide: SupabaseAdminService, useValue: mockSupabaseAdminService(client) },
      ],
    }).compile();

    repo = moduleRef.get(CouponsRepository);
  });

  describe('findByCode', () => {
    it('matches case-insensitively and trims the input', async () => {
      const builder = mockQueryBuilder({ data: { id: 'c1', code: 'CREATOR20' }, error: null });
      client.from.mockReturnValue(builder);

      const result = await repo.findByCode('  creator20  ');

      // ilike, not eq: a user typing lowercase must find the same row the
      // unique index on upper(code) protects.
      expect(builder.ilike).toHaveBeenCalledWith('code', 'creator20');
      expect(result).toEqual({ id: 'c1', code: 'CREATOR20' });
    });

    it('returns null when nothing matches', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: null }));

      await expect(repo.findByCode('NOPE')).resolves.toBeNull();
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'boom' } }));

      await expect(repo.findByCode('X')).rejects.toThrow('boom');
    });
  });

  describe('findById', () => {
    it('returns the coupon', async () => {
      const builder = mockQueryBuilder({ data: { id: 'c1' }, error: null });
      client.from.mockReturnValue(builder);

      await expect(repo.findById('c1')).resolves.toEqual({ id: 'c1' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'c1');
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'nope' } }));

      await expect(repo.findById('c1')).rejects.toThrow('nope');
    });
  });

  describe('list', () => {
    it('returns newest first', async () => {
      const builder = mockQueryBuilder({ data: [{ id: 'c1' }], error: null });
      client.from.mockReturnValue(builder);

      await expect(repo.list()).resolves.toEqual([{ id: 'c1' }]);
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('returns an empty array when there are none', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: null }));

      await expect(repo.list()).resolves.toEqual([]);
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'bad' } }));

      await expect(repo.list()).rejects.toThrow('bad');
    });
  });

  describe('create', () => {
    it('inserts and returns the row', async () => {
      const builder = mockQueryBuilder({ data: { id: 'c1', code: 'X' }, error: null });
      client.from.mockReturnValue(builder);

      await expect(repo.create({ code: 'X' })).resolves.toEqual({ id: 'c1', code: 'X' });
      expect(builder.insert).toHaveBeenCalledWith({ code: 'X' });
    });

    it('throws on a failed insert', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'dupe' } }));

      await expect(repo.create({ code: 'X' })).rejects.toThrow('dupe');
    });
  });

  describe('update', () => {
    it('stamps updated_at alongside the patch', async () => {
      const builder = mockQueryBuilder({ data: { id: 'c1' }, error: null });
      client.from.mockReturnValue(builder);

      await repo.update('c1', { status: 'paused' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'paused', updated_at: expect.any(String) }),
      );
      expect(builder.eq).toHaveBeenCalledWith('id', 'c1');
    });

    it('throws on a failed update', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'locked' } }));

      await expect(repo.update('c1', { status: 'paused' })).rejects.toThrow('locked');
    });
  });

  describe('countUserRedemptions', () => {
    it('counts this user against this coupon', async () => {
      const builder = mockQueryBuilder({ count: 2 });
      client.from.mockReturnValue(builder);

      await expect(repo.countUserRedemptions('c1', 'u1')).resolves.toBe(2);
      expect(builder.eq).toHaveBeenCalledWith('coupon_id', 'c1');
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    });

    it('treats a null count as zero', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ count: null }));

      await expect(repo.countUserRedemptions('c1', 'u1')).resolves.toBe(0);
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ count: null, error: { message: 'x' } }));

      await expect(repo.countUserRedemptions('c1', 'u1')).rejects.toThrow('x');
    });
  });

  describe('redeemAtomic', () => {
    it('calls the RPC rather than reading then writing', async () => {
      client.rpc.mockResolvedValue({ data: 11, error: null });

      await expect(repo.redeemAtomic('c1', 'u1', 'creator', 5000)).resolves.toBe(11);

      // A read-then-write here is the exact race that let users overspend
      // credits; the RPC serialises concurrent claims.
      expect(client.rpc).toHaveBeenCalledWith('redeem_coupon_atomic', {
        p_coupon_id: 'c1',
        p_user_id: 'u1',
        p_plan_id: 'creator',
        p_discount_paise: 5000,
      });
    });

    it('returns null when the claim is refused', async () => {
      client.rpc.mockResolvedValue({ data: null, error: null });

      await expect(repo.redeemAtomic('c1', 'u1', 'creator', 0)).resolves.toBeNull();
    });

    it('throws when the RPC errors', async () => {
      client.rpc.mockResolvedValue({ data: null, error: { message: 'rpc down' } });

      await expect(repo.redeemAtomic('c1', 'u1', 'creator', 0)).rejects.toThrow('rpc down');
    });
  });

  describe('listRedemptions', () => {
    it('returns newest first, capped', async () => {
      const builder = mockQueryBuilder({ data: [{ id: 'r1' }], error: null });
      client.from.mockReturnValue(builder);

      await expect(repo.listRedemptions('c1', 25)).resolves.toEqual([{ id: 'r1' }]);
      expect(builder.order).toHaveBeenCalledWith('redeemed_at', { ascending: false });
      expect(builder.limit).toHaveBeenCalledWith(25);
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'bad' } }));

      await expect(repo.listRedemptions('c1')).rejects.toThrow('bad');
    });
  });

  describe('getRedemptionSummary', () => {
    it('totals the discount given', async () => {
      client.from.mockReturnValue(
        mockQueryBuilder({
          data: [{ discount_paise: 1000 }, { discount_paise: 2500 }, { discount_paise: null }],
          error: null,
        }),
      );

      await expect(repo.getRedemptionSummary('c1')).resolves.toEqual({
        redemptions: 3,
        discountPaise: 3500,
      });
    });

    it('returns zeroes when there are no redemptions', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: null }));

      await expect(repo.getRedemptionSummary('c1')).resolves.toEqual({
        redemptions: 0,
        discountPaise: 0,
      });
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'bad' } }));

      await expect(repo.getRedemptionSummary('c1')).rejects.toThrow('bad');
    });
  });
});
