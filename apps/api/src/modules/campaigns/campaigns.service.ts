import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { EmailService } from '@autoclipr/emails';
import { CouponsService } from '../coupons/coupons.service';
import { CampaignsRepository, ClaimedRecipient, EligibleUser } from './campaigns.repository';

export interface CampaignRunResult {
  dryRun: boolean;
  campaignId: string | null;
  couponCode: string | null;
  scanned: number;
  claimed: number;
  sent: number;
  failed: number;
  skippedUnsubscribed: number;
  skipReason?: string;
}

const PLAN_LABEL: Record<string, string> = {
  creator: 'Creator',
  business: 'Business',
};

/**
 * The weekly discount campaign.
 *
 * Runs every Saturday, finds users still on a free tier, and emails them the
 * currently featured coupon. Safe to run more than once: the campaign is keyed
 * by date and recipients are unique per campaign, so a second run finds the
 * same campaign and sends only to people who have not been sent to yet.
 */
@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly repo: CampaignsRepository,
    private readonly coupons: CouponsService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private cfg() {
    return {
      enabled: this.config.get<boolean>('campaigns.saturdayEnabled') ?? false,
      batchSize: this.config.get<number>('campaigns.batchSize') ?? 500,
      maxPerRun: this.config.get<number>('campaigns.maxPerRun') ?? 5000,
      appUrl: this.config.get<string>('webAppUrl') ?? 'https://autoclipr.com',
      // The click route lives on the API, behind its api/v1 global prefix —
      // pointing this at the web app would 404 every tracked link.
      apiUrl: this.config.get<string>('apiPublicUrl') ?? 'https://api.autoclipr.com',
    };
  }

  /**
   * Saturday 09:00 UTC, matching the retention sweep's UTC convention rather
   * than assuming a local timezone inside business logic.
   */
  // 09:00 UTC on Saturdays. Written out rather than using a CronExpression
  // constant because none covers a specific weekday at a specific hour.
  @Cron('0 9 * * 6', { name: 'saturday-offer-campaign', timeZone: 'UTC' })
  async scheduledRun(): Promise<void> {
    if (!this.cfg().enabled) {
      this.logger.debug('Saturday campaign disabled (CAMPAIGN_SATURDAY_ENABLED != true)');
      return;
    }

    try {
      const result = await this.run({ dryRun: false });
      this.logger.log(
        `Saturday campaign: sent ${result.sent}, failed ${result.failed}, skipped ${result.skippedUnsubscribed} unsubscribed${
          result.skipReason ? ` — ${result.skipReason}` : ''
        }`,
      );
    } catch (err) {
      // A campaign failure must never take the API process down.
      this.logger.error(
        `Saturday campaign failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async run({ dryRun }: { dryRun: boolean }): Promise<CampaignRunResult> {
    const { batchSize, maxPerRun, apiUrl } = this.cfg();
    const scheduledFor = new Date().toISOString().slice(0, 10);

    const empty: CampaignRunResult = {
      dryRun,
      campaignId: null,
      couponCode: null,
      scanned: 0,
      claimed: 0,
      sent: 0,
      failed: 0,
      skippedUnsubscribed: 0,
    };

    // No coupon means no offer. Sending "here is your discount" with no code
    // is worse than sending nothing, so the run stops here.
    const coupon = await this.coupons.getFeatured();
    if (!coupon) {
      const skipReason = 'No active public coupon to advertise';
      this.logger.warn(`Saturday campaign skipped: ${skipReason}`);

      if (!dryRun) {
        const campaign = await this.repo.findOrCreateForDate(
          'saturday_offer',
          scheduledFor,
          'Saturday Offer',
          null,
        );
        await this.repo.updateCampaign(campaign.id, {
          status: 'skipped',
          skip_reason: skipReason,
          completed_at: new Date().toISOString(),
        });
      }
      return { ...empty, skipReason };
    }

    const offerLabel =
      coupon.type === 'percentage'
        ? `${coupon.value}% OFF`
        : coupon.type === 'free_trial'
          ? `${coupon.value} DAYS FREE`
          : `${coupon.value} BONUS CREDITS`;

    const planId = coupon.applicablePlans[0] ?? 'creator';
    const planName = PLAN_LABEL[planId] ?? 'Creator';

    if (dryRun) {
      const preview = await this.countEligible(batchSize, maxPerRun);
      return {
        ...empty,
        couponCode: coupon.code,
        scanned: preview.scanned,
        claimed: preview.eligible,
        skippedUnsubscribed: preview.unsubscribed,
      };
    }

    const campaign = await this.repo.findOrCreateForDate(
      'saturday_offer',
      scheduledFor,
      `Saturday ${offerLabel}`,
      null,
    );
    await this.repo.updateCampaign(campaign.id, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    const unsubscribed = await this.repo.unsubscribedEmails();
    const result: CampaignRunResult = { ...empty, campaignId: campaign.id, couponCode: coupon.code };

    // Anything claimed by an earlier run that crashed before sending. Handled
    // first so a retry finishes what it started rather than starting over.
    const leftovers = await this.repo.findUnsent(campaign.id, maxPerRun);
    for (const r of leftovers) {
      await this.deliver(campaign.id, r, coupon.code, offerLabel, planName, apiUrl, result);
    }

    // Then walk the user table in pages — it grows with the user base and must
    // not be loaded whole.
    for (let offset = 0; offset < maxPerRun; offset += batchSize) {
      const users = await this.repo.findEligibleUsers(offset, batchSize);
      if (!users.length) break;
      result.scanned += users.length;

      const sendable = users.filter((u) => {
        if (unsubscribed.has(u.email.toLowerCase())) {
          result.skippedUnsubscribed += 1;
          return false;
        }
        return true;
      });

      // Claim first, send second. Only rows this call created come back, so
      // users enrolled by an earlier run are never emailed twice.
      const claimed = await this.repo.claimRecipients(campaign.id, sendable);
      result.claimed += claimed.length;

      for (const r of claimed) {
        await this.deliver(campaign.id, r, coupon.code, offerLabel, planName, apiUrl, result);
      }
    }

    await this.repo.updateCampaign(campaign.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Send one email and record the outcome.
   *
   * sent_at is stamped only on success, so a failure leaves the row claimed
   * but unsent and the next run picks it up again.
   */
  private async deliver(
    campaignId: string,
    recipient: ClaimedRecipient,
    couponCode: string,
    offerLabel: string,
    planName: string,
    apiUrl: string,
    result: CampaignRunResult,
  ): Promise<void> {
    // Routed through our own redirect so a click can be attributed before the
    // user lands on pricing with the code already applied.
    const upgradeUrl = `${apiUrl}/api/v1/campaign-click?c=${campaignId}&u=${recipient.user_id}&next=${encodeURIComponent(
      `/pricing?coupon=${couponCode}`,
    )}`;

    const sent = await this.email.sendWeekendOffer(recipient.email, {
      // "Hi there" beats greeting someone by the left half of their email
      // address, which reads worse than not personalising at all.
      userName: recipient.full_name?.trim() || 'there',
      couponCode,
      offerLabel,
      planName,
      expiresOn: null,
      upgradeUrl,
    });

    if (sent) {
      await this.repo.markSent(recipient.id);
      result.sent += 1;
      return;
    }

    result.failed += 1;
    try {
      await this.repo.markFailed(recipient.id, 'Email provider rejected the send');
    } catch (err) {
      this.logger.error(
        `Could not record send failure for ${recipient.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Dry-run counting: how many users a real run would reach. */
  private async countEligible(batchSize: number, maxPerRun: number) {
    const unsubscribed = await this.repo.unsubscribedEmails();
    let scanned = 0;
    let eligible = 0;
    let skipped = 0;

    for (let offset = 0; offset < maxPerRun; offset += batchSize) {
      const users: EligibleUser[] = await this.repo.findEligibleUsers(offset, batchSize);
      if (!users.length) break;
      scanned += users.length;
      for (const u of users) {
        if (unsubscribed.has(u.email.toLowerCase())) skipped += 1;
        else eligible += 1;
      }
    }

    return { scanned, eligible, unsubscribed: skipped };
  }

  async recordClick(campaignId: string, userId: string): Promise<void> {
    try {
      await this.repo.markClicked(campaignId, userId);
    } catch (err) {
      // Never let analytics break the redirect the user is waiting on.
      this.logger.error(
        `Could not record click for ${campaignId}/${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async list() {
    return this.repo.listCampaigns();
  }

  async getStats(campaignId: string) {
    const stats = await this.repo.getStats(campaignId);
    const conversionRate =
      stats.sent > 0 ? Number(((stats.converted / stats.sent) * 100).toFixed(2)) : 0;

    return { ...stats, conversionRate };
  }
}
