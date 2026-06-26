import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AffiliatesRepository } from './affiliates.repository';

// Plan prices in paise (INR)
const PLAN_PRICES_PAISE: Record<string, { monthly: number; yearly: number }> = {
  creator:  { monthly: 39900,   yearly: 418800  },
  business: { monthly: 199900,  yearly: 2098800 },
  starter:  { monthly: 0,       yearly: 0       },
};

function generateRefCode(userId: string): string {
  // Take first 8 chars of UUID (without dashes) as a deterministic-ish code
  const base = userId.replace(/-/g, '').slice(0, 8).toLowerCase();
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}${suffix}`;
}

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(private readonly repo: AffiliatesRepository) {}

  async apply(userId: string, email: string, channelUrl: string) {
    const existing = await this.repo.findByUserId(userId);
    if (existing) throw new ConflictException('You already have an affiliate application.');

    const refCode = generateRefCode(userId);
    const affiliate = await this.repo.create(userId, refCode, email, channelUrl);
    return affiliate;
  }

  async getMyDashboard(userId: string) {
    const affiliate = await this.repo.findByUserId(userId);
    if (!affiliate) throw new NotFoundException('No affiliate account found.');

    const [referrals, commissions, payouts] = await Promise.all([
      this.repo.getReferrals(affiliate.id),
      this.repo.getCommissions(affiliate.id),
      this.repo.getPayouts(affiliate.id),
    ]);

    const pendingEarningsPaise = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.amount_paise, 0);

    const paidOutPaise = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_paise, 0);

    return {
      affiliate,
      referrals,
      commissions,
      payouts,
      stats: {
        total_clicks: affiliate.total_clicks,
        total_referrals: affiliate.total_referrals,
        total_conversions: affiliate.total_conversions,
        total_earnings_paise: affiliate.total_earnings_paise,
        pending_earnings_paise: pendingEarningsPaise,
        paid_out_paise: paidOutPaise,
        available_paise: affiliate.total_earnings_paise - paidOutPaise,
        commission_rate: affiliate.commission_rate,
      },
    };
  }

  async trackSignup(refCode: string, newUserId: string): Promise<void> {
    const affiliate = await this.repo.findByRefCode(refCode);
    if (!affiliate) {
      this.logger.debug(`No active affiliate for ref_code=${refCode}`);
      return;
    }
    if (affiliate.user_id === newUserId) return; // don't self-refer

    await this.repo.trackReferral(affiliate.id, newUserId);
    this.logger.log(`Referral tracked: affiliate=${affiliate.id} -> user=${newUserId}`);
  }

  async awardCommission(
    referredUserId: string,
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
    transactionId: string,
  ): Promise<void> {
    if (planId === 'starter') return; // free plan, no commission

    const referral = await this.repo.findReferralByUser(referredUserId);
    if (!referral) return; // user was not referred

    const prices = PLAN_PRICES_PAISE[planId];
    if (!prices) return;

    const amountPaise = prices[billingPeriod];
    if (!amountPaise) return;

    const { affiliate } = referral;
    const rate = affiliate.commission_rate;

    await this.repo.createCommission(
      affiliate.id,
      referral.id,
      amountPaise,
      rate,
      planId,
      billingPeriod,
      transactionId,
    );

    // Auto-upgrade commission rate based on total conversions
    const conversions = (affiliate.total_conversions ?? 0) + 1;
    await this.repo.updateCommissionRate(affiliate.id, conversions);

    this.logger.log(
      `Commission awarded: affiliate=${affiliate.id} plan=${planId} paise=${Math.round((amountPaise * rate) / 100)}`,
    );
  }

  async requestPayout(userId: string, amountPaise: number, method: string, details: string) {
    const affiliate = await this.repo.findByUserId(userId);
    if (!affiliate) throw new NotFoundException('No affiliate account found.');
    if (affiliate.status !== 'active') throw new BadRequestException('Affiliate account is not active.');

    const available = affiliate.total_earnings_paise - affiliate.total_paid_paise;
    if (amountPaise > available) throw new BadRequestException('Requested amount exceeds available balance.');
    if (amountPaise < 100000) throw new BadRequestException('Minimum payout is ₹1,000.'); // 100000 paise

    return this.repo.createPayout(affiliate.id, amountPaise, method, details);
  }
}
