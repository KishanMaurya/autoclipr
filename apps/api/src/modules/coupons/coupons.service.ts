import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DodoService } from '../billing/dodo.service';
import { Coupon, CouponsRepository, CouponType } from './coupons.repository';

/** Plan list prices in paise, used to value a percentage discount. */
const PLAN_PRICE_PAISE: Record<string, { monthly: number; yearly: number }> = {
  creator: { monthly: 39_900, yearly: 418_800 },
  business: { monthly: 199_900, yearly: 2_098_800 },
  starter: { monthly: 0, yearly: 0 },
};

export interface ValidatedCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  /** What the user saves, in paise. Zero for non-monetary coupon types. */
  discountPaise: number;
  /** Human-readable summary for the checkout UI. */
  description: string;
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    private readonly repo: CouponsRepository,
    private readonly dodo: DodoService,
  ) {}

  /**
   * Decide whether a code may be used, and what it is worth.
   *
   * Every check lives here rather than in the client. The frontend may show
   * the result, but it never decides it — a discount the browser computes is
   * a discount the browser can forge.
   *
   * Throws BadRequestException with a user-facing reason; the caller surfaces
   * the message directly.
   */
  async validate(
    code: string,
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
    userId: string,
  ): Promise<ValidatedCoupon> {
    const coupon = await this.repo.findByCode(code);
    if (!coupon) {
      throw new BadRequestException('That coupon code is not valid.');
    }

    // Deliberately vague past this point: confirming that a code exists but is
    // exhausted or paused tells someone probing for codes that they guessed a
    // real one.
    if (coupon.status !== 'active') {
      throw new BadRequestException('That coupon code is not valid.');
    }

    const now = Date.now();
    if (coupon.starts_at && Date.parse(coupon.starts_at) > now) {
      throw new BadRequestException('That coupon is not active yet.');
    }
    if (coupon.expires_at && Date.parse(coupon.expires_at) <= now) {
      throw new BadRequestException('That coupon has expired.');
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      throw new BadRequestException('That coupon has been fully redeemed.');
    }

    if (coupon.applicable_plans.length > 0 && !coupon.applicable_plans.includes(planId)) {
      throw new BadRequestException('That coupon does not apply to this plan.');
    }

    const alreadyUsed = await this.repo.countUserRedemptions(coupon.id, userId);
    if (alreadyUsed >= coupon.max_uses_per_user) {
      throw new BadRequestException('You have already used this coupon.');
    }

    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountPaise: this.discountPaiseFor(coupon, planId, billingPeriod),
      description: this.describe(coupon),
    };
  }

  /**
   * What the coupon saves in money terms.
   *
   * Only percentage coupons reduce the amount charged. A free-trial coupon
   * defers payment and a free-credits coupon adds value without touching
   * price, so both are worth zero here — counting them as revenue given away
   * would misreport campaign cost.
   */
  private discountPaiseFor(
    coupon: Coupon,
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
  ): number {
    if (coupon.type !== 'percentage') return 0;

    const price = PLAN_PRICE_PAISE[planId]?.[billingPeriod] ?? 0;
    return Math.round((price * coupon.value) / 100);
  }

  private describe(coupon: Coupon): string {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.value}% off`;
      case 'free_trial':
        return `${coupon.value} day${coupon.value === 1 ? '' : 's'} free`;
      case 'free_credits':
        return `${coupon.value} bonus credits`;
    }
  }

  /**
   * Claim the coupon for this user. Call only after the payment it applies to
   * has been confirmed.
   *
   * Re-validates through the atomic RPC rather than trusting the earlier
   * validate() call: time passes between checkout starting and the payment
   * completing, and the last use may have gone to someone else meanwhile.
   */
  async redeem(
    couponId: string,
    userId: string,
    planId: string,
    discountPaise: number,
  ): Promise<boolean> {
    const newCount = await this.repo.redeemAtomic(couponId, userId, planId, discountPaise);

    if (newCount === null) {
      this.logger.warn(
        `Coupon ${couponId} could not be redeemed for ${userId} — exhausted, inactive, or per-user limit reached`,
      );
      return false;
    }

    return true;
  }

  // ─── Admin ──────────────────────────────────────────────────────────────

  async list() {
    return this.repo.list();
  }

  async getWithStats(id: string) {
    const coupon = await this.repo.findById(id);
    if (!coupon) throw new NotFoundException('Coupon not found');

    const [summary, redemptions] = await Promise.all([
      this.repo.getRedemptionSummary(id),
      this.repo.listRedemptions(id, 100),
    ]);

    // `redemptionCount` rather than reusing `redemptions`: the summary's count
    // and the history list are different shapes and one silently shadowed the
    // other when both were named the same.
    return {
      coupon,
      redemptionCount: summary.redemptions,
      discountPaise: summary.discountPaise,
      redemptions,
    };
  }

  /**
   * Create a coupon, mirroring percentage ones into Dodo.
   *
   * Dodo has to know about a percentage discount because the price is set by
   * the product at its hosted checkout — we cannot charge less from our side.
   * The other two types never reach Dodo: a trial is a checkout parameter and
   * bonus credits are granted by us after activation.
   */
  async create(
    input: {
      code: string;
      type: CouponType;
      value: number;
      status?: string;
      starts_at?: string | null;
      expires_at?: string | null;
      max_uses?: number | null;
      max_uses_per_user?: number;
      applicable_plans?: string[];
      visibility?: string;
      description?: string | null;
    },
    createdBy: string,
  ) {
    const code = input.code.trim().toUpperCase();

    const existing = await this.repo.findByCode(code);
    if (existing) {
      throw new BadRequestException(`Coupon code ${code} already exists.`);
    }

    if (input.type === 'percentage' && (input.value < 1 || input.value > 100)) {
      throw new BadRequestException('A percentage coupon must be between 1 and 100.');
    }

    let dodoDiscountId: string | null = null;
    if (input.type === 'percentage') {
      dodoDiscountId = await this.mirrorToDodo(code, input.value, input.expires_at ?? null, input.max_uses ?? null);
    }

    return this.repo.create({
      code,
      type: input.type,
      value: input.value,
      status: (input.status as Coupon['status']) ?? 'draft',
      starts_at: input.starts_at ?? null,
      expires_at: input.expires_at ?? null,
      max_uses: input.max_uses ?? null,
      max_uses_per_user: input.max_uses_per_user ?? 1,
      applicable_plans: input.applicable_plans ?? [],
      visibility: (input.visibility as Coupon['visibility']) ?? 'public',
      description: input.description ?? null,
      dodo_discount_id: dodoDiscountId,
      created_by: createdBy,
    });
  }

  private async mirrorToDodo(
    code: string,
    percent: number,
    expiresAt: string | null,
    maxUses: number | null,
  ): Promise<string | null> {
    try {
      const discount = await this.dodo.createDiscount({
        code,
        // Dodo takes basis points, not percent: 20% is 2000, not 20.
        amount: percent * 100,
        expiresAt,
        usageLimit: maxUses,
      });
      return discount.discount_id ?? null;
    } catch (err) {
      // Without the Dodo side the code would validate here and then charge
      // full price at checkout, which is worse than refusing to create it.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to mirror coupon ${code} to Dodo: ${message}`);
      throw new BadRequestException(
        `Could not register this discount with the payment provider: ${message}`,
      );
    }
  }

  /** Status changes — the admin kill switch. */
  async setStatus(id: string, status: Coupon['status']) {
    const coupon = await this.repo.findById(id);
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.repo.update(id, { status });
  }
}
