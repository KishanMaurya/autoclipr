import { Body, Controller, Get, Headers, Param, Post, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
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

@ApiTags('Campaigns')
@Controller('webhooks')
export class EmailWebhookController {
  constructor(
    private readonly service: CampaignsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Delivery and open events from Resend.
   *
   * These two states cannot be known any other way — nothing we control is
   * involved once the email leaves. Clicks are tracked by our own redirect
   * instead, which is why they need no webhook.
   *
   * Public because Resend has no session, but the signature is verified: an
   * unauthenticated endpoint that writes analytics is an endpoint anyone can
   * use to fabricate them.
   */
  @Public()
  @Post('resend')
  @ApiOperation({ summary: 'Resend delivery and open events' })
  async resend(
    @Headers('svix-signature') signature: string,
    @Headers('svix-id') messageId: string,
    @Headers('svix-timestamp') timestamp: string,
    @Body() body: { type?: string; data?: { to?: string | string[] } },
  ) {
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET') ?? process.env.RESEND_WEBHOOK_SECRET ?? '';

    // Fail closed. Without a configured secret there is no way to tell a real
    // event from a forged one, so nothing is recorded.
    if (!secret) throw new UnauthorizedException('Webhook secret not configured');
    if (!this.verify(secret, messageId, timestamp, JSON.stringify(body), signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const type = body?.type ?? '';
    const to = Array.isArray(body?.data?.to) ? body.data.to[0] : body?.data?.to;
    if (!to) return { received: true };

    if (type === 'email.delivered') await this.service.recordProviderEvent(to, 'delivered');
    else if (type === 'email.opened') await this.service.recordProviderEvent(to, 'opened');

    return { received: true };
  }

  /** Svix scheme, which Resend uses: HMAC-SHA256 over id.timestamp.payload. */
  private verify(
    secret: string,
    id: string,
    timestamp: string,
    payload: string,
    header: string,
  ): boolean {
    if (!id || !timestamp || !header) return false;

    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', key)
      .update(`${id}.${timestamp}.${payload}`)
      .digest('base64');

    // The header carries space-separated "v1,<sig>" entries.
    return header.split(' ').some((part) => {
      const sig = part.split(',')[1] ?? '';
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      // Length check first: timingSafeEqual throws on a mismatch.
      return a.length === b.length && timingSafeEqual(a, b);
    });
  }
}
