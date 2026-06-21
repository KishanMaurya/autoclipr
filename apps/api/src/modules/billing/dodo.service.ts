import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import DodoPayments from 'dodopayments';

const PRODUCT_IDS: Record<string, string> = {
  starter: process.env.DODO_PRODUCT_STARTER ?? '',
  creator: process.env.DODO_PRODUCT_CREATOR ?? '',
  business: process.env.DODO_PRODUCT_BUSINESS ?? '',
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
    userId: string;
    email: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const productId = PRODUCT_IDS[opts.planId];
    if (!productId) throw new Error(`Unknown plan: ${opts.planId}`);

    const session = await this.client.subscriptions.create({
      billing: { city: '', country: 'IN', state: '', street: '', zipcode: '' },
      customer: { email: opts.email, name: opts.email },
      product_id: productId,
      quantity: 1,
      payment_link: true,
      return_url: opts.successUrl,
      metadata: { user_id: opts.userId, plan_id: opts.planId },
    });

    const url = (session as any).payment_link ?? (session as any).url;
    if (!url) throw new Error('Dodo did not return a payment URL');
    return url;
  }

  async getSubscription(subscriptionId: string) {
    return this.client.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.client.subscriptions.update(subscriptionId, { status: 'cancelled' });
  }

  verifyWebhook(payload: string, signature: string): any {
    const webhookSecret = this.config.get<string>('DODO_WEBHOOK_SECRET') ?? '';
    // Dodo uses webhook-secret header verification
    return DodoPayments.Webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
