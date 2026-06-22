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
    const isTest = !apiKey.startsWith('live_');
    this.client = new DodoPayments({ bearerToken: apiKey, environment: isTest ? 'test_mode' : 'live_mode' });
  }

  async createCheckoutUrl(opts: {
    planId: string;
    billingPeriod: 'monthly' | 'yearly';
    userId: string;
    email: string;
    successUrl: string;
    cancelUrl: string;
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
      metadata: { user_id: opts.userId, plan_id: opts.planId, billing_period: opts.billingPeriod },
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
