import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async overview(
    @CurrentUser() user: AuthUser,
    @Query('refresh') refresh?: string,
  ) {
    const data = await this.analyticsService.getOverview(
      user.sub,
      refresh === 'true' || refresh === '1',
    );
    return ApiResponse.ok(data);
  }

  @Post('refresh')
  async refresh(@CurrentUser() user: AuthUser) {
    await this.analyticsService.refreshMetrics(user.sub);
    const data = await this.analyticsService.getOverview(user.sub, false);
    return ApiResponse.ok(data);
  }
}
