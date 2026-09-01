import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DodoService } from '../billing/dodo.service';
import { Coupon, CouponsRepository, CouponType } from './coupons.repository';
import {
  CouponRejectedError,
  MAX_DISCOUNT_PERCENTAGE,
  MIN_DISCOUNT_PERCENTAGE,
} from './coupon-errors';

/** Plan list prices in paise, used to value a percentage discount. */
const PLAN_PRICE_PAISE: Record<string, { monthly: number; yearly: number }> = {
  creator: { monthly: 39_900, yearly: 418_800 },
  business: { monthly: 199_900, yearly: 2_098_800 },
  starter: { monthly: 0, yearly: 0 },
};

export interface ValidatedCoupon {
  valid: true;
  id: string;
  code: string;
  type: CouponType;
  /** Spec-facing alias of `type`, e.g. 'PERCENTAGE'. */
  discountType: string;
  value: number;
  /** 0 for coupon types that do not reduce the price. */
  discountPercentage: number;
  /** List price before the discount, in paise. */
  originalPaise: number;
  /** What the user saves, in paise. Zero for non-monetary coupon types. */
  discountPaise: number;
  /** What they actually pay. Computed server-side, never trusted from a client. */
  finalPaise: number;
  currency: string;
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
    if (!coupon) throw new CouponRejectedError('COUPON_NOT_FOUND');

    if (coupon.status !== 'active') throw new CouponRejectedError('COUPON_INACTIVE');

    const now = Date.now();
    if (coupon.starts_at && Date.parse(coupon.starts_at) > now) {
      throw new CouponRejectedError('COUPON_NOT_STARTED');
    }
    if (coupon.expires_at && Date.parse(coupon.expires_at) <= now) {
      throw new CouponRejectedError('COUPON_EXPIRED');
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      throw new CouponRejectedError('COUPON_EXHAUSTED');
    }

    if (coupon.applicable_plans.length > 0 && !coupon.applicable_plans.includes(planId)) {
      throw new CouponRejectedError('COUPON_PLAN_NOT_ELIGIBLE');
    }

    const alreadyUsed = await this.repo.countUserRedemptions(coupon.id, userId);
    if (alreadyUsed >= coupon.max_uses_per_user) {
      throw new CouponRejectedError('COUPON_USER_LIMIT_REACHED');
    }

    const originalPaise = PLAN_PRICE_PAISE[planId]?.[billingPeriod] ?? 0;
    const discountPaise = this.discountPaiseFor(coupon, planId, billingPeriod);

    return {
      valid: true,
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discountType: coupon.type === 'percentage' ? 'PERCENTAGE' : coupon.type.toUpperCase(),
      value: coupon.value,
      discountPercentage: coupon.type === 'percentage' ? coupon.value : 0,
      originalPaise,
      discountPaise,
      // The backend is the only place this arithmetic happens. A price the
      // browser computes is a price the browser can forge.
      finalPaise: Math.max(0, originalPaise - discountPaise),
      currency: 'INR',
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

  /**
   * The discount floor, enforced here as well as by the database's
   * coupons_min_percentage constraint. Applies only to percentage coupons —
   * `value` means days for free_trial and credits for free_credits, where a
   * 25 floor would be meaningless.
   */
  private assertPercentageInRange(type: CouponType, value: number): void {
    if (type !== 'percentage') return;

    if (value < MIN_DISCOUNT_PERCENTAGE || value > MAX_DISCOUNT_PERCENTAGE) {
      throw new BadRequestException(
        `A percentage coupon must be between ${MIN_DISCOUNT_PERCENTAGE}% and ${MAX_DISCOUNT_PERCENTAGE}%.`,
      );
    }
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

  /**
   * The coupon to advertise in the promo banner, reduced to just what the
   * banner needs. Returns null when there is nothing worth showing, which the
   * banner treats as "render nothing".
   */
  async getFeatured(): Promise<{
    code: string;
    type: CouponType;
    value: number;
    description: string;
    applicablePlans: string[];
  } | null> {
    const coupon = await this.repo.findFeatured();
    if (!coupon) return null;

    return {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: this.describe(coupon),
      applicablePlans: coupon.applicable_plans,
    };
  }

  /**
   * Suggest unique codes an admin can use as-is.
   *
   * Ambiguous characters (0/O, 1/I/L) are excluded: these get read aloud,
   * printed on cards and typed by hand, and a code that cannot be transcribed
   * reliably costs support time.
   */
  async generateCodes(count: number, prefix?: string): Promise<string[]> {
    const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const taken = await this.repo.existingCodes();
    const clean = (prefix ?? 'AC').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Dodo caps codes at 16 characters, and the suffix plus separator needs
    // room, so the prefix cannot eat the whole budget.
    const head = clean.slice(0, 9) || 'AC';
    const out: string[] = [];

    // Bounded rather than while(true): with a large existing set and a short
    // alphabet, an unlucky run should give up rather than spin.
    for (let attempt = 0; attempt < count * 50 && out.length < count; attempt += 1) {
      let suffix = '';
      for (let i = 0; i < 6; i += 1) {
        suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
      const code = `${head}-${suffix}`;
      if (taken.has(code) || out.includes(code)) continue;
      out.push(code);
    }

    if (out.length < count) {
      throw new BadRequestException(
        'Could not generate enough unique codes. Try a different prefix.',
      );
    }

    return out;
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

    this.assertPercentageInRange(input.type, input.value);

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

  /**
   * Edit a coupon.
   *
   * `code` and `type` are deliberately not editable. The code is the coupon's
   * identity on both sides and is baked into links already in circulation;
   * the type decides whether a Dodo discount exists at all, so changing it
   * would mean creating or destroying the mirror underneath live redemptions.
   *
   * When a mirrored field changes, Dodo is updated **first**. If Dodo refuses,
   * nothing has changed anywhere and the edit simply fails. The reverse order
   * would leave us advertising a discount Dodo will not honour, which the user
   * only discovers at the payment screen.
   */
  async update(
    id: string,
    patch: {
      value?: number;
      starts_at?: string | null;
      expires_at?: string | null;
      max_uses?: number | null;
      max_uses_per_user?: number;
      applicable_plans?: string[];
      visibility?: string;
      description?: string | null;
      status?: string;
    },
  ) {
    const coupon = await this.repo.findById(id);
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (patch.value !== undefined) {
      this.assertPercentageInRange(coupon.type, patch.value);
    }

    if (
      patch.max_uses !== undefined &&
      patch.max_uses !== null &&
      patch.max_uses < coupon.used_count
    ) {
      throw new BadRequestException(
        `This coupon has already been redeemed ${coupon.used_count} times; the cap cannot be lower than that.`,
      );
    }

    const touchesDodo =
      coupon.dodo_discount_id !== null &&
      (patch.value !== undefined ||
        patch.expires_at !== undefined ||
        patch.max_uses !== undefined);

    if (touchesDodo) {
      try {
        await this.dodo.updateDiscount(coupon.dodo_discount_id!, {
          ...(patch.value !== undefined ? { amount: patch.value * 100 } : {}),
          ...(patch.expires_at !== undefined ? { expiresAt: patch.expires_at } : {}),
          ...(patch.max_uses !== undefined ? { usageLimit: patch.max_uses } : {}),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to update Dodo discount for ${coupon.code}: ${message}`);
        throw new BadRequestException(
          `Could not update this discount with the payment provider: ${message}`,
        );
      }
    }

    // A cap raised above the current usage makes an exhausted coupon usable
    // again; without this it would stay dead with room left on it.
    const status =
      patch.status ??
      (coupon.status === 'exhausted' &&
      patch.max_uses !== undefined &&
      (patch.max_uses === null || patch.max_uses > coupon.used_count)
        ? 'active'
        : undefined);

    const { status: _ignored, visibility, ...rest } = patch;

    return this.repo.update(id, {
      ...rest,
      ...(visibility ? { visibility: visibility as Coupon['visibility'] } : {}),
      ...(status ? { status: status as Coupon['status'] } : {}),
    });
  }

  /**
   * Delete a coupon.
   *
   * Refused once it has been redeemed. coupon_redemptions cascades from this
   * row, so deleting a used coupon would destroy the campaign's revenue
   * history — the very thing the redemption table exists to record. Expiring
   * it takes it out of circulation and keeps the numbers.
   */
  async delete(id: string) {
    const coupon = await this.repo.findById(id);
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (coupon.used_count > 0) {
      throw new BadRequestException(
        `This coupon has been redeemed ${coupon.used_count} time${coupon.used_count === 1 ? '' : 's'}. Deleting it would erase that history — set it to expired instead.`,
      );
    }

    if (coupon.dodo_discount_id) {
      try {
        await this.dodo.deleteDiscount(coupon.dodo_discount_id);
      } catch (err) {
        // Log and continue: an orphaned Dodo discount whose code no longer
        // exists here can never be validated, so it is inert. Blocking the
        // delete would leave the admin stuck instead.
        this.logger.error(
          `Failed to delete Dodo discount for ${coupon.code}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    await this.repo.delete(id);
    return { deleted: true, id };
  }
}
