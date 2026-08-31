import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

export type CouponType = 'percentage' | 'free_trial' | 'free_credits';
export type CouponStatus = 'draft' | 'active' | 'paused' | 'expired' | 'exhausted';
export type CouponVisibility = 'public' | 'private';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  status: CouponStatus;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  applicable_plans: string[];
  visibility: CouponVisibility;
  dodo_discount_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string | null;
  plan_id: string | null;
  discount_paise: number;
  redeemed_at: string;
}

@Injectable()
export class CouponsRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  private get db() {
    return this.supabase.getClient();
  }

  /**
   * Codes are matched case-insensitively, matching the unique index on
   * upper(code) — a user typing "creator20" must find CREATOR20.
   */
  async findByCode(code: string): Promise<Coupon | null> {
    const { data, error } = await this.db
      .from('coupons')
      .select('*')
      .ilike('code', code.trim())
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as Coupon) ?? null;
  }

  async findById(id: string): Promise<Coupon | null> {
    const { data, error } = await this.db
      .from('coupons')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as Coupon) ?? null;
  }

  async list(): Promise<Coupon[]> {
    const { data, error } = await this.db
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as Coupon[]) ?? [];
  }

  async create(entry: Partial<Coupon>): Promise<Coupon> {
    const { data, error } = await this.db
      .from('coupons')
      .insert(entry)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as Coupon;
  }

  async update(id: string, patch: Partial<Coupon>): Promise<Coupon> {
    const { data, error } = await this.db
      .from('coupons')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as Coupon;
  }

  /** How many times this user has already redeemed this coupon. */
  async countUserRedemptions(couponId: string, userId: string): Promise<number> {
    const { count, error } = await this.db
      .from('coupon_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', couponId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  /**
   * Claim one use of the coupon.
   *
   * Delegates to the RPC rather than reading then writing: a shared public
   * code is exactly the race that let users overspend credits — N concurrent
   * requests all read used_count, all see room, and all proceed. The RPC's
   * conditional UPDATE serialises them.
   *
   * Returns the new used_count, or null if the claim was refused (exhausted,
   * inactive, outside its window, or the user is at their per-user limit).
   */
  async redeemAtomic(
    couponId: string,
    userId: string,
    planId: string,
    discountPaise: number,
  ): Promise<number | null> {
    const { data, error } = await this.db.rpc('redeem_coupon_atomic', {
      p_coupon_id: couponId,
      p_user_id: userId,
      p_plan_id: planId,
      p_discount_paise: discountPaise,
    });

    if (error) throw new Error(error.message);
    return (data as number | null) ?? null;
  }

  async listRedemptions(couponId: string, limit = 100): Promise<CouponRedemption[]> {
    const { data, error } = await this.db
      .from('coupon_redemptions')
      .select('*')
      .eq('coupon_id', couponId)
      .order('redeemed_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data as CouponRedemption[]) ?? [];
  }

  /** Totals for the admin detail view: how many redemptions, worth how much. */
  async getRedemptionSummary(couponId: string): Promise<{
    redemptions: number;
    discountPaise: number;
  }> {
    const { data, error } = await this.db
      .from('coupon_redemptions')
      .select('discount_paise')
      .eq('coupon_id', couponId);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    return {
      redemptions: rows.length,
      discountPaise: rows.reduce(
        (sum, r) => sum + ((r.discount_paise as number | null) ?? 0),
        0,
      ),
    };
  }
}
