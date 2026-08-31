import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import DodoPayments from 'dodopayments';

const PRODUCT_IDS: Record<string, { monthly: string; yearly: string }> = {
  starter: { monthly: '', yearly: '' },
  creator: {
    monthly: process.env.DODO_PRODUCT_CREATOR_MONTHLY ?? process.env.DODO_PRODUCT_CREATOR ?? '',
    yearly: process.env.DODO_PRODUCT_CREATOR_YEARLY ?? process.env.DODO_PRODUCT_CREATOR ?? '',
  },
  business: {
    monthly: process.env.DODO_PRODUCT_BUSINESS_MONTHLY ?? process.env.DODO_PRODUCT_BUSINESS ?? '',
    yearly: process.env.DODO_PRODUCT_BUSINESS_YEARLY ?? process.env.DODO_PRODUCT_BUSINESS ?? '',
  },
};

@Injectable()
export class DodoService {
  private readonly client: DodoPayments;
  private readonly logger = new Logger(DodoService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('DODO_API_KEY') ?? '';
    const isLive = this.config.get<string>('DODO_LIVE_MODE') === 'true';
    this.client = new DodoPayments({ bearerToken: apiKey, environment: isLive ? 'live_mode' : 'test_mode' });
    this.logger.log(`Dodo Payments running in ${isLive ? 'LIVE' : 'TEST'} mode`);
  }

  async createCheckoutUrl(opts: {
    planId: string;
    billingPeriod: 'monthly' | 'yearly';
    userId: string;
    email: string;
    successUrl: string;
    cancelUrl: string;
    /** Validated coupon code, mirrored to a Dodo discount. */
    discountCode?: string | null;
    /** Trial days from a free_trial coupon. */
    trialPeriodDays?: number | null;
  }): Promise<string> {
    const planProducts = PRODUCT_IDS[opts.planId];
    if (!planProducts) throw new Error(`Unknown plan: ${opts.planId}`);
    const productId = planProducts[opts.billingPeriod];
    if (!productId) throw new Error(`No product configured for ${opts.planId} ${opts.billingPeriod}`);

    const session = await this.client.subscriptions.create({
      billing: { city: '', country: 'IN', state: '', street: '', zipcode: '' },
      customer: { email: opts.email, name: opts.email },
      product_id: productId,
      quantity: 1,
      payment_link: true,
      return_url: opts.successUrl,
      metadata: {
        user_id: opts.userId,
        plan_id: opts.planId,
        billing_period: opts.billingPeriod,
        // Carried through checkout so the activation path knows which coupon
        // to claim once the payment is confirmed.
        ...(opts.discountCode ? { coupon_code: opts.discountCode } : {}),
      },
      ...(opts.discountCode ? { discount_codes: [opts.discountCode] } : {}),
      ...(opts.trialPeriodDays ? { trial_period_days: opts.trialPeriodDays } : {}),
    });

    const url = (session as any).payment_link ?? (session as any).url;
    if (!url) throw new Error('Dodo did not return a payment URL');

    // Embed subscription ID into the success URL so frontend captures it on redirect
    const subscriptionId: string = (session as any).subscription_id ?? (session as any).id ?? '';
    if (subscriptionId) {
      return url.replace(
        encodeURIComponent(opts.successUrl),
        encodeURIComponent(`${opts.successUrl}&subscription_id=${subscriptionId}`),
      );
    }

    return url;
  }

  /**
   * Register a percentage discount with Dodo.
   *
   * Dodo is the only place a discount can actually reduce what a customer is
   * charged — the price comes from the product at its hosted checkout — so a
   * percentage coupon has to exist on both sides.
   *
   * `amount` is in basis points (2000 = 20%), and codes are capped at 16
   * characters; both are the caller's responsibility.
   */
  async createDiscount(opts: {
    code: string;
    amount: number;
    expiresAt?: string | null;
    usageLimit?: number | null;
  }) {
    return this.client.discounts.create({
      code: opts.code,
      amount: opts.amount,
      type: 'percentage',
      expires_at: opts.expiresAt ?? null,
      usage_limit: opts.usageLimit ?? null,
    });
  }

  /**
   * Update a mirrored discount. Only the fields that change are sent, so a
   * partial edit does not silently reset the others.
   */
  async updateDiscount(
    discountId: string,
    patch: { amount?: number; expiresAt?: string | null; usageLimit?: number | null },
  ) {
    return this.client.discounts.update(discountId, {
      ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
      ...(patch.expiresAt !== undefined ? { expires_at: patch.expiresAt } : {}),
      ...(patch.usageLimit !== undefined ? { usage_limit: patch.usageLimit } : {}),
    });
  }

  async deleteDiscount(discountId: string) {
    return this.client.discounts.delete(discountId);
  }

  async getSubscription(subscriptionId: string) {
    return this.client.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.client.subscriptions.update(subscriptionId, { status: 'cancelled' });
  }

  verifyWebhook(payload: string, headers: Record<string, string>): any {
    const webhookSecret = this.config.get<string>('DODO_WEBHOOK_SECRET') ?? '';
    return this.client.webhooks.unwrap(payload, { headers, key: webhookSecret });
  }
}
