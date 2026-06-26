import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { AffiliatesService } from './affiliates.service';

class ApplyDto {
  @IsString()
  email!: string;

  @IsString()
  channelUrl!: string;
}

class InquireDto {
  @IsString()
  email!: string;

  @IsString()
  channelUrl!: string;
}

class TrackSignupDto {
  @IsString()
  refCode!: string;
}

class RequestPayoutDto {
  @IsNumber()
  @Min(100000)
  amountPaise!: number;

  @IsString()
  method!: string;

  @IsString()
  @IsOptional()
  details?: string;
}

@Controller('affiliates')
@UseGuards(JwtAuthGuard)
export class AffiliatesController {
  constructor(private readonly service: AffiliatesService) {}

  /**
   * Public endpoint called from the marketing page apply form (no auth required).
   * Records the inquiry and sends a confirmation email.
   */
  @Public()
  @Post('inquire')
  @HttpCode(200)
  async inquire(@Body() dto: InquireDto) {
    await this.service.sendInquiryConfirmation(dto.email, dto.channelUrl);
    return ApiResponse.ok({ received: true });
  }

  /** Submit affiliate application (authenticated — creates real account) */
  @Post('apply')
  async apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyDto) {
    const data = await this.service.apply(user.sub, dto.email, dto.channelUrl);
    return ApiResponse.ok(data);
  }

  /** Get affiliate dashboard (stats + referrals + commissions + payouts) */
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const data = await this.service.getMyDashboard(user.sub);
    return ApiResponse.ok(data);
  }

  /**
   * Called from the frontend after a user signs up.
   * Records that this user was referred by the affiliate whose ref_code
   * was stored in the browser cookie during their visit.
   */
  @Post('track-signup')
  async trackSignup(@CurrentUser() user: AuthUser, @Body() dto: TrackSignupDto) {
    await this.service.trackSignup(dto.refCode, user.sub);
    return ApiResponse.ok({ tracked: true });
  }

  /** Request a payout for available earnings */
  @Post('payouts/request')
  async requestPayout(@CurrentUser() user: AuthUser, @Body() dto: RequestPayoutDto) {
    const data = await this.service.requestPayout(
      user.sub,
      dto.amountPaise,
      dto.method,
      dto.details ?? '',
    );
    return ApiResponse.ok(data);
  }
}
