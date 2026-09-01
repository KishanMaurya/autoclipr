import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { THROTTLE } from '../../config/throttle.config';
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  UpdateCouponStatusDto,
  ValidateCouponDto,
} from './dto/coupon.dto';

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

  /**
   * The coupon advertised in the promo banner, or null.
   *
   * Declared above @Get(':id') deliberately: Nest matches routes in
   * declaration order, so the wildcard would otherwise swallow /featured and
   * hand it to the admin-guarded handler.
   *
   * No AdminGuard — any signed-in user needs this to see the banner. Only
   * public, active, in-window, unexhausted coupons are ever returned, so a
   * private code can never leak here.
   */
  @Get('featured')
  @ApiOperation({
    summary: 'The coupon currently being promoted',
    description: 'Returns null when there is nothing to advertise.',
  })
  async featured() {
    return ApiResponse.ok(await this.service.getFeatured());
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

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Edit a coupon',
    description:
      'Code and type are immutable. Changing the value, expiry or usage cap of a percentage coupon updates the Dodo discount first, so a rejection there leaves nothing changed.',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return ApiResponse.ok(await this.service.update(id, dto));
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Delete a coupon',
    description:
      'Refused once the coupon has been redeemed, since redemptions cascade from it and deleting would erase the campaign history. Expire it instead.',
  })
  async remove(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.delete(id));
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
