import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE } from '../../config/throttle.config';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async overview(@CurrentUser() user: AuthUser) {
    const data = await this.analyticsService.getOverview(user.sub, false);
    return ApiResponse.ok(data);
  }

  @Throttle({
    default: {
      limit: THROTTLE.analyticsRefresh.limit,
      ttl: THROTTLE.analyticsRefresh.ttl,
    },
  })
  @Post('refresh')
  async refresh(@CurrentUser() user: AuthUser) {
    await this.analyticsService.refreshMetrics(user.sub);
    const data = await this.analyticsService.getOverview(user.sub, false);
    return ApiResponse.ok(data);
  }
}
