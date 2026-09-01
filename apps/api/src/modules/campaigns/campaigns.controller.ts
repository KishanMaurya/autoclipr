import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ApiResponse } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CampaignsService } from './campaigns.service';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('admin/campaigns')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List email campaigns' })
  async list() {
    return ApiResponse.ok(await this.service.list());
  }

  @Get(':id/stats')
  @ApiOperation({
    summary: 'Funnel for one campaign',
    description: 'Recipients, sent, delivered, opened, clicked, redeemed, converted.',
  })
  async stats(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.getStats(id));
  }

  @Post('saturday/preview')
  @ApiOperation({
    summary: 'Preview the Saturday campaign',
    description:
      'Reports which coupon would be advertised and how many users would be emailed, without sending anything.',
  })
  async preview() {
    return ApiResponse.ok(await this.service.run({ dryRun: true }));
  }

  @Post('saturday/run')
  @ApiOperation({
    summary: 'Run the Saturday campaign now',
    description:
      'Safe to call twice: recipients are unique per campaign, so a second run only emails users the first did not reach.',
  })
  async run() {
    return ApiResponse.ok(await this.service.run({ dryRun: false }));
  }
}

@ApiTags('Campaigns')
@Controller()
export class CampaignClickController {
  constructor(
    private readonly service: CampaignsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Click tracking for campaign emails.
   *
   * Public because it is followed straight from an inbox, where there is no
   * session. It records the click and redirects; it never reads or writes
   * anything the caller could use to learn about another account.
   */
  @Public()
  @Get('campaign-click')
  @ApiOperation({ summary: 'Record an email click and redirect' })
  async click(
    @Query('c') campaignId: string,
    @Query('u') userId: string,
    @Query('next') next: string,
    @Res() res: Response,
  ) {
    const appUrl = this.config.get<string>('webAppUrl') ?? 'https://autoclipr.com';

    if (campaignId && userId) {
      await this.service.recordClick(campaignId, userId);
    }

    // Only relative paths are honoured. Redirecting to an arbitrary `next`
    // would turn this into an open redirect that phishing could point at any
    // domain while wearing our link.
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/pricing';
    return res.redirect(`${appUrl}${safeNext}`);
  }
}
