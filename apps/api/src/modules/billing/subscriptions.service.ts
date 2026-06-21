import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@autoclipr/emails';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { UsersRepository } from '../users/users.repository';
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
    private readonly email: EmailService,
    private readonly usersRepo: UsersRepository,
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

  // Called on payment success redirect as a reliable fallback to webhooks
  async activatePlanForUser(userId: string, planId: string, userEmail = ''): Promise<void> {
    const tier = PLAN_TIER[planId];
    if (!tier) throw new Error(`Unknown plan: ${planId}`);

    // Ensure profile exists for OAuth users who skipped sync
    await this.usersRepo.ensureProfile(userId, userEmail);

    await this.supabase.getClient()
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    await this.supabase.getClient()
      .from('profiles')
      .update({
        subscription_tier: tier,
        credits: PLAN_CREDITS[planId] ?? 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    await this.sendSubscriptionEmails(userId, planId, '', {});
    this.logger.log(`Plan activated via success redirect: userId=${userId} plan=${planId}`);
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

    // Send confirmation + invoice emails only on new activation
    if (status === 'active') {
      await this.sendSubscriptionEmails(userId, planId, subscriptionId, data);
    }
  }

  private async sendSubscriptionEmails(
    userId: string,
    planId: string,
    subscriptionId: string,
    data: any,
  ): Promise<void> {
    // Fetch user email + name from profiles
    const { data: profile } = await this.supabase.getClient()
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    const appUrl = this.config.get<string>('WEB_APP_URL') ?? 'https://autoclipr.com';
    const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
    const renewalDate = data.next_billing_date
      ? new Date(data.next_billing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';
    const paymentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const amountPaid = data.amount
      ? `₹${(data.amount / 100).toFixed(2)}`
      : planId === 'creator' ? '₹349.00' : planId === 'business' ? '₹1,749.00' : 'Free';
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const transactionId = data.payment_id ?? subscriptionId;

    // 1. Subscription confirmation email
    await this.email.sendSubscriptionConfirmed(profile.email, {
      userName: profile.full_name ?? profile.email,
      planName,
      amount: amountPaid,
      billingCycle: 'Yearly',
      renewalDate,
      subscriptionId,
      dashboardUrl: `${appUrl}/dashboard`,
    });

    // 2. Invoice email (with PDF attachment)
    await this.email.sendInvoice(profile.email, {
      userName: profile.full_name ?? profile.email,
      invoiceNumber,
      transactionId,
      paymentDate,
      amount: amountPaid,
      planName,
      invoiceUrl: `${appUrl}/dashboard/billing`,
    });
  }
}
