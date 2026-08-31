import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { THROTTLE } from '../../config/throttle.config';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponStatusDto, ValidateCouponDto } from './dto/coupon.dto';

@ApiTags('Coupons')
@ApiBearerAuth('JWT')
@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  /**
   * Check a code a user typed at checkout.
   *
   * Rate limited harder than ordinary traffic: this endpoint answers "is this
   * a real coupon?", which is exactly what someone brute-forcing codes needs.
   */
  @Post('validate')
  @Throttle({ default: THROTTLE.expensive })
  @ApiOperation({
    summary: 'Validate a coupon code',
    description:
      'Server-side validation of a coupon against the plan and the calling user. Returns the discount it is worth. The client must never compute this itself.',
  })
  async validate(@CurrentUser() user: AuthUser, @Body() dto: ValidateCouponDto) {
    const result = await this.service.validate(
      dto.code,
      dto.planId,
      dto.billingPeriod ?? 'yearly',
      user.sub,
    );
    return ApiResponse.ok(result);
  }

  // ─── Admin ──────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all coupons' })
  async list() {
    return ApiResponse.ok(await this.service.list());
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Coupon detail with redemption history',
    description: 'Includes redemption count and total discount given, for campaign ROI.',
  })
  async detail(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.getWithStats(id));
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Create a coupon',
    description:
      'Percentage coupons are mirrored to a Dodo discount, since the payment provider is the only place a price reduction can be enforced. Creation fails if that mirror fails.',
  })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCouponDto) {
    return ApiResponse.ok(await this.service.create(dto, user.sub));
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Change a coupon status',
    description:
      'The kill switch: setting a coupon to paused stops redemptions immediately, with no deploy.',
  })
  async setStatus(@Param('id') id: string, @Body() dto: UpdateCouponStatusDto) {
    return ApiResponse.ok(await this.service.setStatus(id, dto.status));
  }
}
