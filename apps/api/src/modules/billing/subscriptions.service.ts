import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@autoclipr/emails';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { UsersRepository } from '../users/users.repository';
import { AffiliatesService } from '../affiliates/affiliates.service';
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
    private readonly affiliates: AffiliatesService,
  ) {}

  async createCheckoutUrl(userId: string, email: string, planId: string, billingPeriod: 'monthly' | 'yearly' = 'yearly'): Promise<string> {
    const appUrl = this.config.get<string>('WEB_APP_URL') ?? 'https://autoclipr.com';
    return this.dodo.createCheckoutUrl({
      planId,
      billingPeriod,
      userId,
      email,
      successUrl: `${appUrl}/dashboard?payment=success&plan=${planId}&billing=${billingPeriod}`,
      cancelUrl: `${appUrl}/pricing?payment=cancelled`,
    });
  }

  // Called on payment success redirect as a reliable fallback to webhooks
  async activatePlanForUser(userId: string, planId: string, userEmail = '', transactionId = '', billingPeriod: 'monthly' | 'yearly' = 'yearly'): Promise<void> {
    const tier = PLAN_TIER[planId];
    if (!tier) throw new Error(`Unknown plan: ${planId}`);

    // Ensure profile exists for OAuth users who skipped sync
    await this.usersRepo.ensureProfile(userId, userEmail);

    const periodEnd = billingPeriod === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await this.supabase.getClient()
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
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

    // Compute amount based on plan + billing period
    const PLAN_AMOUNTS: Record<string, { monthly: string; yearly: string }> = {
      creator:  { monthly: '₹399.00',   yearly: '₹4,188.00' },
      business: { monthly: '₹1,999.00', yearly: '₹20,988.00' },
      starter:  { monthly: 'Free',      yearly: 'Free' },
    };
    const amountPaid = PLAN_AMOUNTS[planId]?.[billingPeriod as 'monthly' | 'yearly'] ?? 'Free';

    // Record transaction
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const internalTxId = `TRN${Date.now().toString().slice(-9).padStart(9, '0')}`;
    try {
      await this.supabase.getClient().from('billing_transactions').insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        plan_id: planId,
        amount: amountPaid,
        status: 'paid',
        transaction_id: internalTxId,
        payment_date: new Date().toISOString(),
        period_end: periodEnd,
        billing_period: billingPeriod,
      });
    } catch (e: any) {
      this.logger.warn(`Failed to record transaction: ${e.message}`);
    }

    // Award referral commission if this user was referred by an affiliate
    try {
      await this.affiliates.awardCommission(userId, planId, billingPeriod, internalTxId);
    } catch (e: any) {
      this.logger.warn(`Failed to award affiliate commission: ${e.message}`);
    }

    // Pass email directly so it works even when profile email is empty (OAuth users)
    await this.sendSubscriptionEmails(userId, planId, internalTxId, { payment_id: internalTxId, billing_period: billingPeriod, amount_override: amountPaid }, userEmail);
    this.logger.log(`Plan activated via success redirect: userId=${userId} plan=${planId}`);
  }

  async getTransactions(userId: string) {
    const { data } = await this.supabase.getClient()
      .from('billing_transactions')
      .select('id, invoice_number, plan_id, amount, status, transaction_id, payment_date, period_end, billing_period')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });
    return data ?? [];
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

    // Award referral commission on every activation (new signup or renewal)
    if (status === 'active') {
      const billingPeriod: 'monthly' | 'yearly' = data.billing_period ?? 'monthly';
      try {
        await this.affiliates.awardCommission(userId, planId, billingPeriod, subscriptionId);
      } catch (e: any) {
        this.logger.warn(`Affiliate commission error: ${e.message}`);
      }
      await this.sendSubscriptionEmails(userId, planId, subscriptionId, data);
    }
  }

  private async sendSubscriptionEmails(
    userId: string,
    planId: string,
    subscriptionId: string,
    data: any,
    fallbackEmail = '',
  ): Promise<void> {
    // Fetch user email + name from profiles
    const { data: profile } = await this.supabase.getClient()
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    const toEmail = profile?.email || fallbackEmail;
    if (!toEmail) {
      this.logger.warn(`No email found for userId=${userId}, skipping subscription emails`);
      return;
    }

    const appUrl = this.config.get<string>('WEB_APP_URL') ?? 'https://autoclipr.com';
    const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
    const billingPeriod: string = data.billing_period ?? 'yearly';
    const billingCycleLabel = billingPeriod === 'monthly' ? 'Monthly' : 'Yearly';
    const renewalDate = data.next_billing_date
      ? new Date(data.next_billing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';
    const paymentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const PLAN_AMOUNTS: Record<string, { monthly: string; yearly: string }> = {
      creator:  { monthly: '₹399.00',   yearly: '₹4,188.00' },
      business: { monthly: '₹1,999.00', yearly: '₹20,988.00' },
      starter:  { monthly: 'Free',      yearly: 'Free' },
    };
    const amountPaid = data.amount_override
      ?? (data.amount ? `₹${(data.amount / 100).toFixed(2)}` : (PLAN_AMOUNTS[planId]?.[billingPeriod as 'monthly' | 'yearly'] ?? 'Free'));
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const transactionId = `TRN${Date.now().toString().slice(-9).padStart(9, '0')}`;

    // 1. Subscription confirmation email
    await this.email.sendSubscriptionConfirmed(toEmail, {
      userName: profile?.full_name ?? toEmail.split('@')[0],
      planName,
      amount: amountPaid,
      billingCycle: billingCycleLabel,
      renewalDate,
      subscriptionId,
      dashboardUrl: `${appUrl}/dashboard`,
    });

    // 2. Invoice email (with PDF attachment — also include download link)
    const userName = profile?.full_name ?? toEmail.split('@')[0];
    const invoiceDownloadUrl = `${this.config.get<string>('API_URL') ?? 'https://api.autoclipr.com'}/api/v1/billing/invoice/download?invoiceNumber=${invoiceNumber}&plan=${encodeURIComponent(planName)}&amount=${encodeURIComponent(amountPaid)}&date=${encodeURIComponent(paymentDate)}&name=${encodeURIComponent(userName)}&txId=${encodeURIComponent(transactionId)}`;
    await this.email.sendInvoice(toEmail, {
      userName: profile?.full_name ?? toEmail.split('@')[0],
      invoiceNumber,
      transactionId,
      paymentDate,
      amount: amountPaid,
      planName,
      invoiceUrl: invoiceDownloadUrl,
    });
  }
}
