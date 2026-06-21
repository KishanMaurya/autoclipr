import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { DodoService } from './dodo.service';

const PLAN_TIER: Record<string, string> = {
  starter: 'starter',
  creator: 'creator',
  business: 'business',
};

const PLAN_CREDITS: Record<string, number> = {
  starter: 100,
  creator: 500,
  business: 1200,
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly dodo: DodoService,
    private readonly supabase: SupabaseAdminService,
    private readonly config: ConfigService,
  ) {}

  async createCheckoutUrl(userId: string, email: string, planId: string): Promise<string> {
    const appUrl = this.config.get<string>('WEB_APP_URL') ?? 'https://autoclipr.com';
    return this.dodo.createCheckoutUrl({
      planId,
      userId,
      email,
      successUrl: `${appUrl}/dashboard?payment=success&plan=${planId}`,
      cancelUrl: `${appUrl}/pricing?payment=cancelled`,
    });
  }

  async handleWebhookEvent(event: any): Promise<void> {
    const type: string = event.event_type ?? event.type ?? '';
    this.logger.log(`Dodo webhook: ${type}`);

    if (type === 'subscription.active' || type === 'subscription.created') {
      await this.upsertSubscription(event.data, 'active');
    } else if (type === 'subscription.renewed') {
      await this.upsertSubscription(event.data, 'active');
    } else if (type === 'subscription.plan_changed') {
      await this.upsertSubscription(event.data, 'active');
    } else if (type === 'subscription.cancelled') {
      await this.upsertSubscription(event.data, 'cancelled');
    } else if (type === 'subscription.expired') {
      await this.upsertSubscription(event.data, 'expired');
    } else if (type === 'subscription.on_hold' || type === 'subscription.failed') {
      await this.upsertSubscription(event.data, 'on_hold');
    } else if (type === 'payment.succeeded') {
      this.logger.log(`Payment succeeded: ${event.data?.payment_id}`);
    }
  }

  private async upsertSubscription(data: any, status: string): Promise<void> {
    if (!data) return;

    const userId: string = data.metadata?.user_id ?? data.customer?.id ?? '';
    const planId: string = data.metadata?.plan_id ?? 'starter';
    const subscriptionId: string = data.subscription_id ?? data.id ?? '';
    const periodEnd = data.next_billing_date ?? data.current_period_end ?? null;
    const tier = PLAN_TIER[planId] ?? 'starter';

    if (!userId) {
      this.logger.warn('Webhook missing user_id in metadata');
      return;
    }

    // Upsert subscription record
    const { error: subError } = await this.supabase.getClient()
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status,
        stripe_subscription_id: subscriptionId, // reusing this column for dodo subscription id
        current_period_start: data.created_at ?? new Date().toISOString(),
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      this.logger.error(`Failed to upsert subscription: ${subError.message}`);
      return;
    }

    // Update profile subscription_tier and credits on activation
    const profileTier = status === 'active' ? tier : 'starter';
    const profileUpdate: Record<string, any> = {
      subscription_tier: profileTier,
      updated_at: new Date().toISOString(),
    };
    if (status === 'active') {
      profileUpdate.credits = PLAN_CREDITS[planId] ?? 100;
    }
    const { error: profileError } = await this.supabase.getClient()
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileError) {
      this.logger.error(`Failed to update profile tier: ${profileError.message}`);
    }
  }
}
