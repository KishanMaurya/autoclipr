import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  /** Capped at 16 characters because Dodo's discount codes are. */
  @IsString()
  @Length(3, 16)
  code!: string;

  @IsIn(['percentage', 'free_trial', 'free_credits'])
  type!: 'percentage' | 'free_trial' | 'free_credits';

  /** Percent for percentage, days for free_trial, credits for free_credits. */
  @IsInt()
  @Min(1)
  value!: number;

  @IsOptional()
  @IsIn(['draft', 'active', 'paused'])
  status?: 'draft' | 'active' | 'paused';

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsISO8601()
  expires_at?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_uses?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  max_uses_per_user?: number;

  /** Empty or omitted means the coupon applies to every plan. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  applicable_plans?: string[];

  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class UpdateCouponStatusDto {
  /**
   * 'exhausted' is not settable by hand — it is a consequence of the usage
   * cap being reached, applied by the redemption function.
   */
  @IsIn(['draft', 'active', 'paused', 'expired'])
  status!: 'draft' | 'active' | 'paused' | 'expired';
}

export class ValidateCouponDto {
  @IsString()
  @Length(3, 16)
  code!: string;

  @IsString()
  planId!: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingPeriod?: 'monthly' | 'yearly';
}
