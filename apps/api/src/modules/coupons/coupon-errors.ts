import { BadRequestException } from '@nestjs/common';

/**
 * Why a coupon was refused.
 *
 * Machine-readable so the client can react (offer a different plan, prompt a
 * sign-in) rather than pattern-matching on prose.
 */
export type CouponErrorCode =
  | 'COUPON_NOT_FOUND'
  | 'COUPON_INACTIVE'
  | 'COUPON_NOT_STARTED'
  | 'COUPON_EXPIRED'
  | 'COUPON_EXHAUSTED'
  | 'COUPON_USER_LIMIT_REACHED'
  | 'COUPON_PLAN_NOT_ELIGIBLE';

/** The smallest percentage discount a coupon may offer. */
export const MIN_DISCOUNT_PERCENTAGE = 25;
export const MAX_DISCOUNT_PERCENTAGE = 100;

const MESSAGES: Record<CouponErrorCode, string> = {
  COUPON_NOT_FOUND: 'That coupon code is not valid.',
  // Deliberately identical to NOT_FOUND's wording. Telling someone a code
  // exists but is paused confirms they guessed a real one, which is exactly
  // what someone enumerating codes wants to learn. The code differs so our own
  // logs and analytics can still tell them apart.
  COUPON_INACTIVE: 'That coupon code is not valid.',
  COUPON_NOT_STARTED: 'That coupon is not active yet.',
  COUPON_EXPIRED: 'This coupon has expired.',
  COUPON_EXHAUSTED: 'This coupon has been fully redeemed.',
  COUPON_USER_LIMIT_REACHED: 'You have already used this coupon.',
  COUPON_PLAN_NOT_ELIGIBLE: 'That coupon does not apply to this plan.',
};

/**
 * A refusal carrying its reason code.
 *
 * Extends BadRequestException so Nest serialises it as a 400 with the body
 * `{ valid: false, error, message }` — no exception filter needed.
 */
export class CouponRejectedError extends BadRequestException {
  readonly code: CouponErrorCode;

  constructor(code: CouponErrorCode, message?: string) {
    super({ valid: false, error: code, message: message ?? MESSAGES[code] });
    this.code = code;
  }
}
