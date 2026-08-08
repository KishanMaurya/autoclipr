import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesRepository } from './affiliates.repository';

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findByUserId: jest.fn().mockResolvedValue(null),
    findByRefCode: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    incrementClicks: jest.fn().mockResolvedValue(undefined),
    trackReferral: jest.fn().mockResolvedValue(null),
    findReferralByUser: jest.fn().mockResolvedValue(null),
    createCommission: jest.fn().mockResolvedValue(undefined),
    updateCommissionRate: jest.fn().mockResolvedValue(undefined),
    getReferrals: jest.fn().mockResolvedValue([]),
    getCommissions: jest.fn().mockResolvedValue([]),
    getPayouts: jest.fn().mockResolvedValue([]),
    createPayout: jest.fn(),
    getProfileEmail: jest.fn().mockResolvedValue(''),
    ...overrides,
  } as unknown as AffiliatesRepository;
}

function makeEmail(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    sendAffiliateApplicationReceived: jest.fn().mockResolvedValue(undefined),
    sendAffiliateApproved: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

function makeUsersRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    ensureProfile: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe('AffiliatesService', () => {
  describe('sendInquiryConfirmation', () => {
    it('sends the inquiry confirmation email', async () => {
      const email = makeEmail();
      const service = new AffiliatesService(makeRepo(), email, makeUsersRepo());
      await service.sendInquiryConfirmation('a@b.com', 'https://yt.com/x');
      expect(email.sendAffiliateApplicationReceived).toHaveBeenCalledWith('a@b.com', 'https://yt.com/x');
    });
  });

  describe('apply', () => {
    it('throws ConflictException when the user already has an affiliate account', async () => {
      const repo = makeRepo({ findByUserId: jest.fn().mockResolvedValue({ id: 'a1' }) });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await expect(service.apply('u1', 'a@b.com', 'https://yt')).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('ensures the profile exists, creates the affiliate and sends the approval email', async () => {
      const created = { id: 'a1', ref_code: 'abc12345' };
      const repo = makeRepo({ create: jest.fn().mockResolvedValue(created) });
      const usersRepo = makeUsersRepo();
      const email = makeEmail();
      const service = new AffiliatesService(repo, email, usersRepo);

      const result = await service.apply('u1', 'a@b.com', 'https://yt');

      expect(usersRepo.ensureProfile).toHaveBeenCalledWith('u1', 'a@b.com');
      expect(repo.create).toHaveBeenCalledWith('u1', expect.any(String), 'a@b.com', 'https://yt');
      const generatedRefCode = (repo.create as jest.Mock).mock.calls[0][1];
      expect(email.sendAffiliateApproved).toHaveBeenCalledWith('a@b.com', generatedRefCode, 'https://yt');
      expect(result).toEqual(created);
    });

    it('still returns the affiliate when the approval email fails to send', async () => {
      const created = { id: 'a1', ref_code: 'abc12345' };
      const repo = makeRepo({ create: jest.fn().mockResolvedValue(created) });
      const email = makeEmail({
        sendAffiliateApproved: jest.fn().mockRejectedValue(new Error('smtp down')),
      });
      const service = new AffiliatesService(repo, email, makeUsersRepo());

      await expect(service.apply('u1', 'a@b.com', 'https://yt')).resolves.toEqual(created);
    });
  });

  describe('getMyDashboard', () => {
    it('throws NotFoundException when the user has no affiliate account', async () => {
      const service = new AffiliatesService(makeRepo(), makeEmail(), makeUsersRepo());
      await expect(service.getMyDashboard('u1')).rejects.toThrow(NotFoundException);
    });

    it('computes pending/paid/available earnings from commissions and payouts', async () => {
      const affiliate = {
        id: 'a1',
        total_clicks: 100,
        total_referrals: 10,
        total_conversions: 5,
        total_earnings_paise: 50000,
        commission_rate: 30,
      };
      const repo = makeRepo({
        findByUserId: jest.fn().mockResolvedValue(affiliate),
        getReferrals: jest.fn().mockResolvedValue([{ id: 'r1' }]),
        getCommissions: jest.fn().mockResolvedValue([
          { id: 'c1', status: 'pending', amount_paise: 10000 },
          { id: 'c2', status: 'paid', amount_paise: 5000 },
          { id: 'c3', status: 'pending', amount_paise: 2000 },
        ]),
        getPayouts: jest.fn().mockResolvedValue([
          { id: 'p1', status: 'paid', amount_paise: 8000 },
          { id: 'p2', status: 'pending', amount_paise: 3000 },
        ]),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());

      const dashboard = await service.getMyDashboard('u1');

      expect(dashboard.stats).toEqual({
        total_clicks: 100,
        total_referrals: 10,
        total_conversions: 5,
        total_earnings_paise: 50000,
        pending_earnings_paise: 12000,
        paid_out_paise: 8000,
        available_paise: 42000, // 50000 - 8000
        commission_rate: 30,
      });
      expect(dashboard.referrals).toEqual([{ id: 'r1' }]);
    });

    it('zeroes out pending/paid earnings when there are no commissions or payouts', async () => {
      const affiliate = {
        id: 'a1',
        total_clicks: 0,
        total_referrals: 0,
        total_conversions: 0,
        total_earnings_paise: 0,
        commission_rate: 30,
      };
      const repo = makeRepo({ findByUserId: jest.fn().mockResolvedValue(affiliate) });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      const dashboard = await service.getMyDashboard('u1');
      expect(dashboard.stats.pending_earnings_paise).toBe(0);
      expect(dashboard.stats.paid_out_paise).toBe(0);
      expect(dashboard.stats.available_paise).toBe(0);
    });
  });

  describe('trackSignup', () => {
    it('does nothing when the ref code has no active affiliate', async () => {
      const repo = makeRepo({ findByRefCode: jest.fn().mockResolvedValue(null) });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await service.trackSignup('bad-code', 'u2');
      expect(repo.trackReferral).not.toHaveBeenCalled();
    });

    it('does not self-refer when the affiliate signs up under their own code', async () => {
      const repo = makeRepo({
        findByRefCode: jest.fn().mockResolvedValue({ id: 'a1', user_id: 'u1' }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await service.trackSignup('abc123', 'u1');
      expect(repo.trackReferral).not.toHaveBeenCalled();
    });

    it('tracks the referral for a valid, non-self ref code', async () => {
      const repo = makeRepo({
        findByRefCode: jest.fn().mockResolvedValue({ id: 'a1', user_id: 'u1' }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await service.trackSignup('abc123', 'u2');
      expect(repo.trackReferral).toHaveBeenCalledWith('a1', 'u2');
    });
  });

  describe('awardCommission', () => {
    it('does nothing for the free "starter" plan', async () => {
      const repo = makeRepo();
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await service.awardCommission('u1', 'starter', 'monthly', 'tx1');
      expect(repo.findReferralByUser).not.toHaveBeenCalled();
    });

    it('does nothing when the user was not referred', async () => {
      const repo = makeRepo({ findReferralByUser: jest.fn().mockResolvedValue(null) });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await service.awardCommission('u1', 'creator', 'monthly', 'tx1');
      expect(repo.createCommission).not.toHaveBeenCalled();
    });

    it('does nothing for an unknown plan id', async () => {
      const repo = makeRepo({
        findReferralByUser: jest.fn().mockResolvedValue({
          id: 'r1',
          affiliate: { id: 'a1', commission_rate: 30, total_conversions: 0 },
        }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await service.awardCommission('u1', 'nonexistent-plan', 'monthly', 'tx1');
      expect(repo.createCommission).not.toHaveBeenCalled();
    });

    it('creates the commission at the referral affiliate rate and bumps commission rate tier', async () => {
      const affiliate = { id: 'a1', commission_rate: 30, total_conversions: 5 };
      const repo = makeRepo({
        findReferralByUser: jest.fn().mockResolvedValue({ id: 'r1', affiliate }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());

      await service.awardCommission('u2', 'creator', 'monthly', 'tx1');

      expect(repo.createCommission).toHaveBeenCalledWith('a1', 'r1', 39900, 30, 'creator', 'monthly', 'tx1');
      expect(repo.updateCommissionRate).toHaveBeenCalledWith('a1', 6); // total_conversions + 1
    });

    it('uses the yearly price for yearly billing period', async () => {
      const affiliate = { id: 'a1', commission_rate: 35, total_conversions: 0 };
      const repo = makeRepo({
        findReferralByUser: jest.fn().mockResolvedValue({ id: 'r1', affiliate }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());

      await service.awardCommission('u2', 'business', 'yearly', 'tx2');

      expect(repo.createCommission).toHaveBeenCalledWith('a1', 'r1', 2098800, 35, 'business', 'yearly', 'tx2');
    });

    it('defaults total_conversions to 0 before incrementing when missing', async () => {
      const affiliate = { id: 'a1', commission_rate: 30 }; // no total_conversions field
      const repo = makeRepo({
        findReferralByUser: jest.fn().mockResolvedValue({ id: 'r1', affiliate }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await service.awardCommission('u2', 'creator', 'monthly', 'tx3');
      expect(repo.updateCommissionRate).toHaveBeenCalledWith('a1', 1);
    });
  });

  describe('requestPayout', () => {
    it('throws NotFoundException when there is no affiliate account', async () => {
      const repo = makeRepo({ findByUserId: jest.fn().mockResolvedValue(null) });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await expect(service.requestPayout('u1', 200000, 'upi', 'x')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the affiliate account is not active', async () => {
      const repo = makeRepo({
        findByUserId: jest.fn().mockResolvedValue({
          id: 'a1',
          status: 'suspended',
          total_earnings_paise: 500000,
          total_paid_paise: 0,
        }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await expect(service.requestPayout('u1', 200000, 'upi', 'x')).rejects.toThrow(
        'Affiliate account is not active.',
      );
    });

    it('throws BadRequestException when the requested amount exceeds available balance', async () => {
      const repo = makeRepo({
        findByUserId: jest.fn().mockResolvedValue({
          id: 'a1',
          status: 'active',
          total_earnings_paise: 100000,
          total_paid_paise: 50000, // available = 50000
        }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await expect(service.requestPayout('u1', 60000, 'upi', 'x')).rejects.toThrow(
        'Requested amount exceeds available balance.',
      );
    });

    it('throws BadRequestException when the amount is below the minimum payout (₹1,000 / 100000 paise)', async () => {
      const repo = makeRepo({
        findByUserId: jest.fn().mockResolvedValue({
          id: 'a1',
          status: 'active',
          total_earnings_paise: 500000,
          total_paid_paise: 0,
        }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await expect(service.requestPayout('u1', 99999, 'upi', 'x')).rejects.toThrow('Minimum payout is ₹1,000.');
    });

    it('creates the payout when amount is within [minimum, available]', async () => {
      const payout = { id: 'p1', amount_paise: 100000, status: 'pending' };
      const repo = makeRepo({
        findByUserId: jest.fn().mockResolvedValue({
          id: 'a1',
          status: 'active',
          total_earnings_paise: 500000,
          total_paid_paise: 0,
        }),
        createPayout: jest.fn().mockResolvedValue(payout),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());

      await expect(service.requestPayout('u1', 100000, 'upi', 'user@upi')).resolves.toEqual(payout);
      expect(repo.createPayout).toHaveBeenCalledWith('a1', 100000, 'upi', 'user@upi');
    });

    it('allows a payout request exactly equal to the available balance', async () => {
      const repo = makeRepo({
        findByUserId: jest.fn().mockResolvedValue({
          id: 'a1',
          status: 'active',
          total_earnings_paise: 150000,
          total_paid_paise: 0,
        }),
        createPayout: jest.fn().mockResolvedValue({ id: 'p2' }),
      });
      const service = new AffiliatesService(repo, makeEmail(), makeUsersRepo());
      await expect(service.requestPayout('u1', 150000, 'upi', 'x')).resolves.toEqual({ id: 'p2' });
    });
  });
});
