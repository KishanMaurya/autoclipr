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
  GenerateCodesDto,
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

  /**
   * The coupon advertised in the promo banner, or null.
   *
   * Lives on the user controller, not the admin one: the promo banner needs
   * it for any signed-in user. Only
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

}


/**
 * Admin coupon management.
 *
 * Guards are declared on the class, not per method: a new route added here
 * cannot accidentally ship unauthorised by someone forgetting a decorator.
 */
@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'List all coupons' })
  async list() {
    return ApiResponse.ok(await this.service.list());
  }


  @Get(':id')
  @ApiOperation({
    summary: 'Coupon detail with redemption history',
    description: 'Includes redemption count and total discount given, for campaign ROI.',
  })
  async detail(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.getWithStats(id));
  }

  @Post()
  @ApiOperation({
    summary: 'Create a coupon',
    description:
      'Percentage coupons are mirrored to a Dodo discount, since the payment provider is the only place a price reduction can be enforced. Creation fails if that mirror fails.',
  })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCouponDto) {
    return ApiResponse.ok(await this.service.create(dto, user.sub));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a coupon',
    description:
      'Code and type are immutable. Changing the value, expiry or usage cap of a percentage coupon updates the Dodo discount first, so a rejection there leaves nothing changed.',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return ApiResponse.ok(await this.service.update(id, dto));
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a coupon',
    description:
      'Refused once the coupon has been redeemed, since redemptions cascade from it and deleting would erase the campaign history. Expire it instead.',
  })
  async remove(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.delete(id));
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change a coupon status',
    description:
      'The kill switch: setting a coupon to paused stops redemptions immediately, with no deploy.',
  })
  async setStatus(@Param('id') id: string, @Body() dto: UpdateCouponStatusDto) {
    return ApiResponse.ok(await this.service.setStatus(id, dto.status));
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a coupon' })
  async activate(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.setStatus(id, 'active'));
  }

  @Post(':id/pause')
  @ApiOperation({
    summary: 'Pause a coupon',
    description: 'The kill switch — redemptions stop immediately, with no deploy.',
  })
  async pause(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.setStatus(id, 'paused'));
  }

  @Get(':id/redemptions')
  @ApiOperation({
    summary: 'Redemption history for a coupon',
    description: 'Who redeemed it, against which plan, and what the discount was worth.',
  })
  async redemptions(@Param('id') id: string) {
    const data = await this.service.getWithStats(id);
    return ApiResponse.ok({
      redemptionCount: data.redemptionCount,
      discountPaise: data.discountPaise,
      redemptions: data.redemptions,
    });
  }

  @Post('generate-codes')
  @ApiOperation({
    summary: 'Suggest unique coupon codes',
    description:
      'Generates codes that do not collide with existing ones. Ambiguous characters (0/O, 1/I/L) are excluded so codes survive being read aloud or typed by hand.',
  })
  async generateCodes(@Body() dto: GenerateCodesDto) {
    return ApiResponse.ok({ codes: await this.service.generateCodes(dto.count ?? 5, dto.prefix) });
  }
}
