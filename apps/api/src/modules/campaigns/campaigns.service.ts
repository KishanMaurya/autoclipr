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
  /** Already sent today before this run, and the provider's daily quota. */
  sentToday?: number;
  dailyCap?: number;
  /** True when today's quota was already spent, so nothing more went out. */
  capReached?: boolean;
  /** Still waiting for a later day of this wave. */
  remaining?: number;
  /** Which days are still needed to finish, given the cap. */
  daysRemaining?: number;
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
      dailyCap: this.config.get<number>('campaigns.dailyCap') ?? 100,
      appUrl: this.config.get<string>('webAppUrl') ?? 'https://autoclipr.com',
      // The click route lives on the API, behind its api/v1 global prefix —
      // pointing this at the web app would 404 every tracked link.
      apiUrl: this.config.get<string>('apiPublicUrl') ?? 'https://api.autoclipr.com',
    };
  }

  /**
   * The Friday a given day's wave belongs to, or null outside the send window.
   *
   * One wave spans Friday to Monday and is identified by its Friday. That
   * matters for more than tidiness: campaigns are keyed by (type,
   * scheduled_for), so keying on "today" would make Friday and Saturday two
   * separate campaigns — and the UNIQUE (campaign_id, user_id) guard that
   * stops duplicates only works within a single campaign. Everyone emailed on
   * Friday would be emailed again on Saturday.
   *
   * getUTCDay: Sun=0, Mon=1, Fri=5, Sat=6.
   */
  static waveStartDate(now: Date): string | null {
    const daysSinceFriday: Record<number, number> = { 5: 0, 6: 1, 0: 2, 1: 3 };
    const offset = daysSinceFriday[now.getUTCDay()];
    if (offset === undefined) return null;

    const friday = new Date(now);
    friday.setUTCDate(friday.getUTCDate() - offset);
    return friday.toISOString().slice(0, 10);
  }

  /**
   * 09:00 UTC on Friday, Saturday, Sunday and Monday.
   *
   * Four days because the provider's daily quota is smaller than the audience:
   * at 100/day a few hundred eligible users cannot be reached in one sitting.
   * Each day sends the next slice of the same wave; Monday mops up whatever is
   * left. UTC throughout, matching the retention sweep, rather than assuming a
   * local timezone inside business logic.
   */
  @Cron('0 9 * * 5,6,0,1', { name: 'weekend-offer-campaign', timeZone: 'UTC' })
  async scheduledRun(): Promise<void> {
    if (!this.cfg().enabled) {
      this.logger.debug('Weekend campaign disabled (CAMPAIGN_SATURDAY_ENABLED != true)');
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
    const { batchSize, maxPerRun, dailyCap, apiUrl } = this.cfg();
    const now = new Date();

    // Outside Fri-Mon there is no wave to add to. A manual run still works —
    // it joins the most recent wave rather than starting a stray one.
    const scheduledFor = CampaignsService.waveStartDate(now) ?? lastFriday(now);

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

    // The provider's quota is per calendar day, so budget against what has
    // already gone out today rather than per run — a manual send followed by
    // the cron on the same day must not add up to twice the quota.
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const sentToday = await this.repo.countSentOnDate(campaign.id, dayStart.toISOString());
    let budget = Math.max(0, dailyCap - sentToday);

    result.sentToday = sentToday;
    result.dailyCap = dailyCap;

    if (budget === 0) {
      this.logger.log(
        `Daily cap reached for campaign ${campaign.id}: ${sentToday}/${dailyCap} already sent today`,
      );
      result.capReached = true;
      await this.repo.updateCampaign(campaign.id, { status: 'running' });
      return result;
    }

    // Anything claimed by an earlier run that crashed before sending. Handled
    // first so a retry finishes what it started rather than starting over.
    const leftovers = await this.repo.findUnsent(campaign.id, budget);
    for (const r of leftovers) {
      if (budget <= 0) break;
      await this.deliver(campaign.id, r, coupon.code, offerLabel, planName, apiUrl, result);
      budget -= 1;
    }

    // Then walk the user table in pages — it grows with the user base and must
    // not be loaded whole.
    for (let offset = 0; offset < maxPerRun && budget > 0; offset += batchSize) {
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

      // Claim only what today's remaining quota can actually deliver. Claiming
      // more would mark users as enrolled without emailing them, and the next
      // day would treat them as already handled.
      const claimed = await this.repo.claimRecipients(campaign.id, sendable.slice(0, budget));
      result.claimed += claimed.length;

      for (const r of claimed) {
        if (budget <= 0) break;
        await this.deliver(campaign.id, r, coupon.code, offerLabel, planName, apiUrl, result);
        budget -= 1;
      }
    }

    // A wave spans four days, so completion is not "this run finished" — it is
    // "nobody is left". Closing it after Friday's slice would leave Saturday
    // looking at a completed campaign with 200 people still unemailed.
    const [totalSent, totalEligible] = await Promise.all([
      this.repo.countSentTotal(campaign.id),
      this.repo.countEligibleUsers(),
    ]);
    const remaining = Math.max(0, totalEligible - totalSent);

    result.remaining = remaining;
    result.daysRemaining = dailyCap > 0 ? Math.ceil(remaining / dailyCap) : 0;

    await this.repo.updateCampaign(campaign.id, {
      status: remaining === 0 ? 'completed' : 'running',
      ...(remaining === 0 ? { completed_at: new Date().toISOString() } : {}),
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

  /**
   * Called once a coupon redemption has been confirmed by payment.
   *
   * Never throws: the user has already paid and their plan is already active,
   * so an attribution failure must not surface as an error on that path.
   */
  async recordRedemption(userId: string): Promise<void> {
    try {
      await this.repo.markRedeemed(userId, true);
    } catch (err) {
      this.logger.error(
        `Could not attribute redemption for ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Delivery and open events reported by the email provider. */
  async recordProviderEvent(email: string, type: 'delivered' | 'opened'): Promise<void> {
    try {
      await this.repo.markProviderEvent(email, type === 'delivered' ? 'delivered_at' : 'opened_at');
    } catch (err) {
      this.logger.error(
        `Could not record ${type} for ${email}: ${err instanceof Error ? err.message : String(err)}`,
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

/**
 * The most recent Friday on or before `now`.
 *
 * Used when a run is triggered by hand midweek: it joins the wave that just
 * ended rather than opening a stray one on, say, a Wednesday.
 */
function lastFriday(now: Date): string {
  const d = new Date(now);
  // getUTCDay: Sun=0 ... Fri=5, Sat=6. Days back to the previous Friday.
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 2) % 7));
  return d.toISOString().slice(0, 10);
}
