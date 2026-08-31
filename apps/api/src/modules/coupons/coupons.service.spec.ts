import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DodoService } from '../billing/dodo.service';
import { Coupon, CouponsRepository } from './coupons.repository';
import { CouponsService } from './coupons.service';

const NOW = new Date('2026-09-15T12:00:00.000Z');
const DAY = 86_400_000;

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'c1',
    code: 'CREATOR20',
    type: 'percentage',
    value: 20,
    status: 'active',
    starts_at: null,
    expires_at: null,
    max_uses: 1000,
    used_count: 10,
    max_uses_per_user: 1,
    applicable_plans: [],
    visibility: 'public',
    dodo_discount_id: 'dis_1',
    description: null,
    created_by: 'admin-1',
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

describe('CouponsService', () => {
  let service: CouponsService;
  let repo: jest.Mocked<CouponsRepository>;
  let dodo: jest.Mocked<DodoService>;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    repo = {
      findByCode: jest.fn().mockResolvedValue(coupon()),
      findById: jest.fn().mockResolvedValue(coupon()),
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (e) => ({ ...coupon(), ...e })),
      update: jest.fn().mockImplementation(async (_id, p) => ({ ...coupon(), ...p })),
      countUserRedemptions: jest.fn().mockResolvedValue(0),
      redeemAtomic: jest.fn().mockResolvedValue(11),
      delete: jest.fn().mockResolvedValue(undefined),
      listRedemptions: jest.fn().mockResolvedValue([]),
      getRedemptionSummary: jest.fn().mockResolvedValue({ redemptions: 0, discountPaise: 0 }),
    } as unknown as jest.Mocked<CouponsRepository>;

    dodo = {
      createDiscount: jest.fn().mockResolvedValue({ discount_id: 'dis_new' }),
      updateDiscount: jest.fn().mockResolvedValue({}),
      deleteDiscount: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DodoService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: CouponsRepository, useValue: repo },
        { provide: DodoService, useValue: dodo },
      ],
    }).compile();

    service = moduleRef.get(CouponsService);
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('validate', () => {
    it('accepts a live coupon and values the discount against the plan price', async () => {
      const result = await service.validate('CREATOR20', 'creator', 'yearly', 'u1');

      // Creator yearly is ₹4,188 = 418800 paise; 20% = 83760.
      expect(result).toMatchObject({
        id: 'c1',
        code: 'CREATOR20',
        type: 'percentage',
        value: 20,
        discountPaise: 83_760,
        description: '20% off',
      });
    });

    it('values a monthly discount against the monthly price', async () => {
      const result = await service.validate('CREATOR20', 'creator', 'monthly', 'u1');

      expect(result.discountPaise).toBe(7_980); // 20% of ₹399
    });

    it('rejects an unknown code', async () => {
      repo.findByCode.mockResolvedValue(null);

      await expect(service.validate('NOPE', 'creator', 'yearly', 'u1')).rejects.toThrow(
        'That coupon code is not valid.',
      );
    });

    it.each(['draft', 'paused', 'expired', 'exhausted'] as const)(
      'rejects a %s coupon without revealing that the code exists',
      async (status) => {
        repo.findByCode.mockResolvedValue(coupon({ status }));

        // Same message as an unknown code on purpose: a distinct error would
        // confirm to someone guessing codes that they found a real one.
        await expect(service.validate('CREATOR20', 'creator', 'yearly', 'u1')).rejects.toThrow(
          'That coupon code is not valid.',
        );
      },
    );

    it('rejects a coupon whose start date has not arrived', async () => {
      repo.findByCode.mockResolvedValue(
        coupon({ starts_at: new Date(NOW.getTime() + DAY).toISOString() }),
      );

      await expect(service.validate('CREATOR20', 'creator', 'yearly', 'u1')).rejects.toThrow(
        'not active yet',
      );
    });

    it('rejects an expired coupon', async () => {
      repo.findByCode.mockResolvedValue(
        coupon({ expires_at: new Date(NOW.getTime() - DAY).toISOString() }),
      );

      await expect(service.validate('CREATOR20', 'creator', 'yearly', 'u1')).rejects.toThrow(
        'has expired',
      );
    });

    it('rejects a coupon that has hit its usage cap', async () => {
      repo.findByCode.mockResolvedValue(coupon({ max_uses: 50, used_count: 50 }));

      await expect(service.validate('CREATOR20', 'creator', 'yearly', 'u1')).rejects.toThrow(
        'fully redeemed',
      );
    });

    it('allows an uncapped coupon regardless of use count', async () => {
      repo.findByCode.mockResolvedValue(coupon({ max_uses: null, used_count: 99_999 }));

      await expect(service.validate('CREATOR20', 'creator', 'yearly', 'u1')).resolves.toBeDefined();
    });

    it('rejects a coupon that does not cover the chosen plan', async () => {
      repo.findByCode.mockResolvedValue(coupon({ applicable_plans: ['business'] }));

      await expect(service.validate('CREATOR20', 'creator', 'yearly', 'u1')).rejects.toThrow(
        'does not apply to this plan',
      );
    });

    it('treats an empty plan list as applying to every plan', async () => {
      repo.findByCode.mockResolvedValue(coupon({ applicable_plans: [] }));

      await expect(
        service.validate('CREATOR20', 'business', 'yearly', 'u1'),
      ).resolves.toBeDefined();
    });

    it('rejects a user who has hit their per-user limit', async () => {
      repo.countUserRedemptions.mockResolvedValue(1);

      await expect(service.validate('CREATOR20', 'creator', 'yearly', 'u1')).rejects.toThrow(
        'already used this coupon',
      );
    });

    it('allows a second use when the per-user limit permits it', async () => {
      repo.findByCode.mockResolvedValue(coupon({ max_uses_per_user: 3 }));
      repo.countUserRedemptions.mockResolvedValue(1);

      await expect(service.validate('CREATOR20', 'creator', 'yearly', 'u1')).resolves.toBeDefined();
    });

    it('values non-monetary coupon types at zero', async () => {
      // A trial defers payment and credits add value without touching price,
      // so counting either as revenue given away would misreport campaign cost.
      repo.findByCode.mockResolvedValue(coupon({ type: 'free_trial', value: 30 }));
      const trial = await service.validate('TRIAL30', 'creator', 'yearly', 'u1');
      expect(trial).toMatchObject({ discountPaise: 0, description: '30 days free' });

      repo.findByCode.mockResolvedValue(coupon({ type: 'free_credits', value: 500 }));
      const credits = await service.validate('BONUS', 'creator', 'yearly', 'u1');
      expect(credits).toMatchObject({ discountPaise: 0, description: '500 bonus credits' });
    });

    it('singularises a one-day trial', async () => {
      repo.findByCode.mockResolvedValue(coupon({ type: 'free_trial', value: 1 }));

      const result = await service.validate('TRIAL1', 'creator', 'yearly', 'u1');

      expect(result.description).toBe('1 day free');
    });

    it('values a discount on an unknown plan at zero rather than throwing', async () => {
      const result = await service.validate('CREATOR20', 'mystery', 'yearly', 'u1');

      expect(result.discountPaise).toBe(0);
    });
  });

  describe('redeem', () => {
    it('returns true when the atomic claim succeeds', async () => {
      await expect(service.redeem('c1', 'u1', 'creator', 1000)).resolves.toBe(true);
      expect(repo.redeemAtomic).toHaveBeenCalledWith('c1', 'u1', 'creator', 1000);
    });

    it('returns false when the claim is refused', async () => {
      repo.redeemAtomic.mockResolvedValue(null);

      await expect(service.redeem('c1', 'u1', 'creator', 0)).resolves.toBe(false);
    });
  });

  describe('create', () => {
    it('uppercases the code and mirrors a percentage coupon to Dodo', async () => {
      repo.findByCode.mockResolvedValue(null);

      await service.create(
        { code: 'summer20', type: 'percentage', value: 20, max_uses: 500 },
        'admin-1',
      );

      // Dodo takes basis points, so 20% is 2000 — getting this wrong would
      // give a 20x or 1/100th discount.
      expect(dodo.createDiscount).toHaveBeenCalledWith({
        code: 'SUMMER20',
        amount: 2000,
        expiresAt: null,
        usageLimit: 500,
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SUMMER20', dodo_discount_id: 'dis_new' }),
      );
    });

    it('does not touch Dodo for trial or credit coupons', async () => {
      repo.findByCode.mockResolvedValue(null);

      await service.create({ code: 'BONUS', type: 'free_credits', value: 500 }, 'admin-1');

      expect(dodo.createDiscount).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ dodo_discount_id: null }),
      );
    });

    it('refuses a duplicate code', async () => {
      repo.findByCode.mockResolvedValue(coupon());

      await expect(
        service.create({ code: 'CREATOR20', type: 'percentage', value: 20 }, 'admin-1'),
      ).rejects.toThrow('already exists');
      expect(repo.create).not.toHaveBeenCalled();
    });

    it.each([0, 101, 500])('refuses a percentage of %i', async (value) => {
      repo.findByCode.mockResolvedValue(null);

      await expect(
        service.create({ code: 'BAD', type: 'percentage', value }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not create the coupon when the Dodo mirror fails', async () => {
      repo.findByCode.mockResolvedValue(null);
      dodo.createDiscount.mockRejectedValue(new Error('dodo rejected the code'));

      // Saving it anyway would mean the code validates here and then charges
      // full price at checkout — worse than refusing to create it.
      await expect(
        service.create({ code: 'SUMMER20', type: 'percentage', value: 20 }, 'admin-1'),
      ).rejects.toThrow('dodo rejected the code');
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('defaults to draft, public, one-per-user and every plan', async () => {
      repo.findByCode.mockResolvedValue(null);

      await service.create({ code: 'BONUS', type: 'free_credits', value: 100 }, 'admin-1');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'draft',
          visibility: 'public',
          max_uses_per_user: 1,
          applicable_plans: [],
          max_uses: null,
          created_by: 'admin-1',
        }),
      );
    });
  });

  describe('update', () => {
    it('updates Dodo before the local row when a mirrored field changes', async () => {
      const order: string[] = [];
      dodo.updateDiscount.mockImplementation(async () => {
        order.push('dodo');
        return {} as never;
      });
      repo.update.mockImplementation(async () => {
        order.push('local');
        return coupon();
      });

      await service.update('c1', { value: 30 });

      // Local-first would leave us advertising a discount Dodo may reject,
      // which the user only discovers at the payment screen.
      expect(order).toEqual(['dodo', 'local']);
      expect(dodo.updateDiscount).toHaveBeenCalledWith('dis_1', { amount: 3000 });
    });

    it('sends only the fields that changed', async () => {
      await service.update('c1', { expires_at: '2026-12-01T00:00:00.000Z' });

      expect(dodo.updateDiscount).toHaveBeenCalledWith('dis_1', {
        expiresAt: '2026-12-01T00:00:00.000Z',
      });
    });

    it('leaves everything unchanged when Dodo rejects the edit', async () => {
      dodo.updateDiscount.mockRejectedValue(new Error('dodo said no'));

      await expect(service.update('c1', { value: 30 })).rejects.toThrow('dodo said no');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('does not call Dodo for fields it does not know about', async () => {
      await service.update('c1', { description: 'Autumn campaign', max_uses_per_user: 3 });

      expect(dodo.updateDiscount).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ description: 'Autumn campaign', max_uses_per_user: 3 }),
      );
    });

    it('does not call Dodo for an unmirrored coupon type', async () => {
      repo.findById.mockResolvedValue(coupon({ type: 'free_credits', dodo_discount_id: null }));

      await service.update('c1', { value: 750 });

      expect(dodo.updateDiscount).not.toHaveBeenCalled();
    });

    it('refuses a usage cap below what has already been redeemed', async () => {
      repo.findById.mockResolvedValue(coupon({ used_count: 40 }));

      await expect(service.update('c1', { max_uses: 10 })).rejects.toThrow(
        'already been redeemed 40 times',
      );
      expect(dodo.updateDiscount).not.toHaveBeenCalled();
    });

    it.each([0, 101])('refuses a percentage of %i', async (value) => {
      await expect(service.update('c1', { value })).rejects.toThrow(BadRequestException);
    });

    it('revives an exhausted coupon when the cap is raised', async () => {
      repo.findById.mockResolvedValue(coupon({ status: 'exhausted', max_uses: 50, used_count: 50 }));

      await service.update('c1', { max_uses: 200 });

      // Otherwise it would sit dead with room left on it.
      expect(repo.update).toHaveBeenCalledWith('c1', expect.objectContaining({ status: 'active' }));
    });

    it('does not revive an exhausted coupon on an unrelated edit', async () => {
      repo.findById.mockResolvedValue(coupon({ status: 'exhausted', max_uses: 50, used_count: 50 }));

      await service.update('c1', { description: 'note' });

      expect(repo.update).toHaveBeenCalledWith('c1', expect.not.objectContaining({ status: 'active' }));
    });

    it('honours an explicit status over the revive rule', async () => {
      repo.findById.mockResolvedValue(coupon({ status: 'exhausted', max_uses: 50, used_count: 50 }));

      await service.update('c1', { max_uses: 200, status: 'paused' });

      expect(repo.update).toHaveBeenCalledWith('c1', expect.objectContaining({ status: 'paused' }));
    });

    it('throws for an unknown coupon', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('nope', { value: 30 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes an unused coupon and its Dodo mirror', async () => {
      repo.findById.mockResolvedValue(coupon({ used_count: 0 }));

      await expect(service.delete('c1')).resolves.toEqual({ deleted: true, id: 'c1' });
      expect(dodo.deleteDiscount).toHaveBeenCalledWith('dis_1');
      expect(repo.delete).toHaveBeenCalledWith('c1');
    });

    it('refuses to delete a coupon that has been redeemed', async () => {
      repo.findById.mockResolvedValue(coupon({ used_count: 823 }));

      // coupon_redemptions cascades from this row, so deleting would erase
      // the campaign revenue history the table exists to record.
      await expect(service.delete('c1')).rejects.toThrow('redeemed 823 times');
      expect(repo.delete).not.toHaveBeenCalled();
      expect(dodo.deleteDiscount).not.toHaveBeenCalled();
    });

    it('singularises the refusal for a single redemption', async () => {
      repo.findById.mockResolvedValue(coupon({ used_count: 1 }));

      await expect(service.delete('c1')).rejects.toThrow('redeemed 1 time.');
    });

    it('still deletes locally when the Dodo mirror cannot be removed', async () => {
      repo.findById.mockResolvedValue(coupon({ used_count: 0 }));
      dodo.deleteDiscount.mockRejectedValue(new Error('already gone'));

      // An orphaned Dodo discount whose code no longer exists here can never
      // be validated, so it is inert — better than leaving the admin stuck.
      await expect(service.delete('c1')).resolves.toEqual({ deleted: true, id: 'c1' });
      expect(repo.delete).toHaveBeenCalledWith('c1');
    });

    it('skips Dodo entirely for an unmirrored coupon', async () => {
      repo.findById.mockResolvedValue(
        coupon({ used_count: 0, type: 'free_credits', dodo_discount_id: null }),
      );

      await service.delete('c1');

      expect(dodo.deleteDiscount).not.toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith('c1');
    });

    it('throws for an unknown coupon', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setStatus', () => {
    it('updates the status', async () => {
      await service.setStatus('c1', 'paused');

      expect(repo.update).toHaveBeenCalledWith('c1', { status: 'paused' });
    });

    it('throws for an unknown coupon', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.setStatus('nope', 'paused')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWithStats', () => {
    it('returns the coupon with its redemption totals', async () => {
      repo.getRedemptionSummary.mockResolvedValue({ redemptions: 823, discountPaise: 32_100_000 });
      repo.listRedemptions.mockResolvedValue([]);

      const result = await service.getWithStats('c1');

      // Distinct names: the count and the history list are different shapes.
      expect(result).toMatchObject({ redemptionCount: 823, discountPaise: 32_100_000 });
      expect(result.redemptions).toEqual([]);
      expect(result.coupon.code).toBe('CREATOR20');
    });

    it('throws for an unknown coupon', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getWithStats('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('delegates to the repository', async () => {
      await service.list();
      expect(repo.list).toHaveBeenCalled();
    });
  });
});
