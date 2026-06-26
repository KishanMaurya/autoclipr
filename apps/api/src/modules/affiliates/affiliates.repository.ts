import { Injectable, Logger } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

export interface Affiliate {
  id: string;
  user_id: string;
  ref_code: string;
  status: string;
  commission_rate: number;
  total_clicks: number;
  total_referrals: number;
  total_conversions: number;
  total_earnings_paise: number;
  total_paid_paise: number;
  channel_url: string | null;
  email: string | null;
  applied_at: string;
  approved_at: string | null;
}

export interface Referral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  status: string;
  plan_id: string | null;
  created_at: string;
  converted_at: string | null;
}

export interface Commission {
  id: string;
  amount_paise: number;
  commission_rate: number;
  plan_id: string | null;
  billing_period: string | null;
  status: string;
  transaction_id: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  amount_paise: number;
  status: string;
  payment_method: string;
  paid_at: string | null;
  created_at: string;
}

@Injectable()
export class AffiliatesRepository {
  private readonly logger = new Logger(AffiliatesRepository.name);

  constructor(private readonly supabase: SupabaseAdminService) {}

  private get db() {
    return this.supabase.getClient();
  }

  async findByUserId(userId: string): Promise<Affiliate | null> {
    const { data } = await this.db
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data ?? null;
  }

  async findByRefCode(refCode: string): Promise<Affiliate | null> {
    const { data } = await this.db
      .from('affiliates')
      .select('*')
      .eq('ref_code', refCode)
      .eq('status', 'active')
      .single();
    return data ?? null;
  }

  async create(userId: string, refCode: string, email: string, channelUrl: string): Promise<Affiliate> {
    const { data, error } = await this.db
      .from('affiliates')
      .insert({
        user_id: userId,
        ref_code: refCode,
        email,
        channel_url: channelUrl,
        status: 'active',        // auto-approved
        commission_rate: 30,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create affiliate: ${error.message}`);
    return data;
  }

  async incrementClicks(affiliateId: string): Promise<void> {
    await this.db.rpc('increment_affiliate_clicks', { aff_id: affiliateId });
  }

  async trackReferral(affiliateId: string, referredUserId: string): Promise<Referral | null> {
    // Check if this user was already tracked (idempotent)
    const { data: existing } = await this.db
      .from('referrals')
      .select('id')
      .eq('referred_user_id', referredUserId)
      .single();
    if (existing) return null;

    const { data, error } = await this.db
      .from('referrals')
      .insert({ affiliate_id: affiliateId, referred_user_id: referredUserId })
      .select()
      .single();
    if (error) {
      this.logger.warn(`Failed to track referral: ${error.message}`);
      return null;
    }

    // Atomic increment via RPC
    await this.db.rpc('increment_affiliate_referrals', { aff_id: affiliateId });

    // Store referred_by on the user profile
    await this.db
      .from('profiles')
      .update({ referred_by: affiliateId })
      .eq('id', referredUserId)
      .is('referred_by', null); // only set once

    return data;
  }

  async findReferralByUser(referredUserId: string): Promise<(Referral & { affiliate: Affiliate }) | null> {
    const { data } = await this.db
      .from('referrals')
      .select('*, affiliate:affiliates(*)')
      .eq('referred_user_id', referredUserId)
      .single();
    return data ?? null;
  }

  async createCommission(
    affiliateId: string,
    referralId: string,
    amountPaise: number,
    commissionRate: number,
    planId: string,
    billingPeriod: string,
    transactionId: string,
  ): Promise<void> {
    const commissionPaise = Math.round((amountPaise * commissionRate) / 100);

    const { error } = await this.db
      .from('affiliate_commissions')
      .insert({
        affiliate_id: affiliateId,
        referral_id: referralId,
        amount_paise: commissionPaise,
        commission_rate: commissionRate,
        plan_id: planId,
        billing_period: billingPeriod,
        transaction_id: transactionId,
        status: 'pending',
      });

    if (error) {
      this.logger.warn(`Failed to create commission: ${error.message}`);
      return;
    }

    // Update affiliate earnings + conversion status
    await this.db
      .from('affiliates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', affiliateId);

    await this.db.rpc('add_affiliate_earnings', {
      aff_id: affiliateId,
      earned: commissionPaise,
    });

    // Mark referral as converted
    await this.db
      .from('referrals')
      .update({ status: 'converted', plan_id: planId, converted_at: new Date().toISOString() })
      .eq('id', referralId)
      .eq('status', 'signed_up');
  }

  async updateCommissionRate(affiliateId: string, conversions: number): Promise<void> {
    const rate = conversions >= 21 ? 40 : conversions >= 6 ? 35 : 30;
    await this.db
      .from('affiliates')
      .update({ commission_rate: rate, updated_at: new Date().toISOString() })
      .eq('id', affiliateId);
  }

  async getReferrals(affiliateId: string): Promise<Referral[]> {
    const { data } = await this.db
      .from('referrals')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async getCommissions(affiliateId: string): Promise<Commission[]> {
    const { data } = await this.db
      .from('affiliate_commissions')
      .select('id, amount_paise, commission_rate, plan_id, billing_period, status, transaction_id, created_at')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async getPayouts(affiliateId: string): Promise<Payout[]> {
    const { data } = await this.db
      .from('affiliate_payouts')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async createPayout(affiliateId: string, amountPaise: number, method: string, details: string): Promise<Payout> {
    const { data, error } = await this.db
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliateId,
        amount_paise: amountPaise,
        payment_method: method,
        payment_details: details,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create payout: ${error.message}`);
    return data;
  }

  async getProfileEmail(userId: string): Promise<string> {
    const { data } = await this.db
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    return data?.email ?? '';
  }
}
