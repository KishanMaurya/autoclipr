import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@autoclipr/emails';
import { CouponsService } from '../coupons/coupons.service';
import { CampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';

const CAMPAIGN = {
  id: 'camp-1',
  name: 'Saturday 25% OFF',
  type: 'saturday_offer',
  coupon_id: null,
  status: 'pending' as const,
  scheduled_for: '2026-09-05',
  skip_reason: null,
  started_at: null,
  completed_at: null,
  created_at: '2026-09-05T09:00:00.000Z',
};

const FEATURED = {
  code: 'SATURDAY25',
  type: 'percentage' as const,
  value: 25,
  description: '25% off',
  applicablePlans: ['creator'],
};

function user(i: number, overrides: Record<string, unknown> = {}) {
  return { id: `u${i}`, email: `user${i}@example.com`, full_name: `User ${i}`, ...overrides };
}

describe('CampaignsService', () => {
  let service: CampaignsService;
  let repo: jest.Mocked<CampaignsRepository>;
  let coupons: jest.Mocked<CouponsService>;
  let email: jest.Mocked<EmailService>;
  let settings: Record<string, unknown>;

  beforeEach(async () => {
    settings = {
      'campaigns.saturdayEnabled': true,
      'campaigns.batchSize': 2,
      'campaigns.maxPerRun': 10,
      webAppUrl: 'https://autoclipr.com',
      apiPublicUrl: 'https://api.autoclipr.com',
    };

    repo = {
      findOrCreateForDate: jest.fn().mockResolvedValue(CAMPAIGN),
      updateCampaign: jest.fn().mockResolvedValue(undefined),
      listCampaigns: jest.fn().mockResolvedValue([]),
      findEligibleUsers: jest.fn().mockResolvedValue([]),
      unsubscribedEmails: jest.fn().mockResolvedValue(new Set<string>()),
      claimRecipients: jest.fn().mockImplementation(async (_c, users) =>
        users.map((u: ReturnType<typeof user>) => ({
          id: `r-${u.id}`,
          user_id: u.id,
          email: u.email,
          full_name: u.full_name,
        })),
      ),
      markSent: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      findUnsent: jest.fn().mockResolvedValue([]),
      markClicked: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn(),
    } as unknown as jest.Mocked<CampaignsRepository>;

    coupons = { getFeatured: jest.fn().mockResolvedValue(FEATURED) } as unknown as jest.Mocked<CouponsService>;
    email = { sendWeekendOffer: jest.fn().mockResolvedValue(true) } as unknown as jest.Mocked<EmailService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: CampaignsRepository, useValue: repo },
        { provide: CouponsService, useValue: coupons },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: { get: (k: string) => settings[k] } },
      ],
    }).compile();

    service = moduleRef.get(CampaignsService);
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('eligibility', () => {
    it('emails a free user', async () => {
      repo.findEligibleUsers.mockResolvedValueOnce([user(1)]).mockResolvedValue([]);

      const result = await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).toHaveBeenCalledWith(
        'user1@example.com',
        expect.objectContaining({ couponCode: 'SATURDAY25', offerLabel: '25% OFF' }),
      );
      expect(result.sent).toBe(1);
    });

    it('never emails an unsubscribed user', async () => {
      repo.findEligibleUsers.mockResolvedValueOnce([user(1), user(2)]).mockResolvedValue([]);
      repo.unsubscribedEmails.mockResolvedValue(new Set(['user1@example.com']));

      const result = await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).toHaveBeenCalledTimes(1);
      expect(email.sendWeekendOffer).toHaveBeenCalledWith('user2@example.com', expect.anything());
      expect(result.skippedUnsubscribed).toBe(1);
    });

    it('matches unsubscribes case-insensitively', async () => {
      repo.findEligibleUsers
        .mockResolvedValueOnce([user(1, { email: 'User1@Example.COM' })])
        .mockResolvedValue([]);
      repo.unsubscribedEmails.mockResolvedValue(new Set(['user1@example.com']));

      const result = await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).not.toHaveBeenCalled();
      expect(result.skippedUnsubscribed).toBe(1);
    });

    it('leaves paid-tier filtering to the query, which only returns free tiers', async () => {
      await service.run({ dryRun: false });

      // Read at send time from the database, never from anything a client
      // believed earlier.
      expect(repo.findEligibleUsers).toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('reuses the same campaign when run twice on one day', async () => {
      await service.run({ dryRun: false });
      await service.run({ dryRun: false });

      expect(repo.findOrCreateForDate).toHaveBeenCalledTimes(2);
      const [firstArgs, secondArgs] = repo.findOrCreateForDate.mock.calls;
      expect(firstArgs[1]).toBe(secondArgs[1]);
    });

    it('sends nothing on a second run when everyone is already claimed', async () => {
      repo.findEligibleUsers.mockResolvedValueOnce([user(1)]).mockResolvedValue([]);
      // The unique (campaign_id, user_id) index means a re-claim returns
      // nothing, which is what stops a duplicate email.
      repo.claimRecipients.mockResolvedValue([]);

      const result = await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).not.toHaveBeenCalled();
      expect(result.sent).toBe(0);
    });

    it('finishes rows a crashed run claimed but never sent', async () => {
      repo.findUnsent.mockResolvedValue([
        { id: 'r-old', user_id: 'u9', email: 'old@example.com', full_name: 'Old' },
      ]);

      const result = await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).toHaveBeenCalledWith('old@example.com', expect.anything());
      expect(result.sent).toBe(1);
    });

    it('does not stamp sent when the provider rejects the email', async () => {
      repo.findEligibleUsers.mockResolvedValueOnce([user(1)]).mockResolvedValue([]);
      email.sendWeekendOffer.mockResolvedValue(false);

      const result = await service.run({ dryRun: false });

      // Left claimed-but-unsent so the next run retries it.
      expect(repo.markSent).not.toHaveBeenCalled();
      expect(repo.markFailed).toHaveBeenCalled();
      expect(result.failed).toBe(1);
    });
  });

  describe('no coupon', () => {
    it('sends nothing and records why', async () => {
      coupons.getFeatured.mockResolvedValue(null);

      const result = await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).not.toHaveBeenCalled();
      expect(result.skipReason).toContain('No active public coupon');
      expect(repo.updateCampaign).toHaveBeenCalledWith(
        'camp-1',
        expect.objectContaining({ status: 'skipped' }),
      );
    });
  });

  describe('batching', () => {
    it('pages through users rather than loading them all', async () => {
      repo.findEligibleUsers
        .mockResolvedValueOnce([user(1), user(2)])
        .mockResolvedValueOnce([user(3), user(4)])
        .mockResolvedValue([]);

      const result = await service.run({ dryRun: false });

      expect(repo.findEligibleUsers).toHaveBeenNthCalledWith(1, 0, 2);
      expect(repo.findEligibleUsers).toHaveBeenNthCalledWith(2, 2, 2);
      expect(result.sent).toBe(4);
    });

    it('stops as soon as a page comes back empty', async () => {
      repo.findEligibleUsers.mockResolvedValue([]);

      await service.run({ dryRun: false });

      expect(repo.findEligibleUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('email content', () => {
    it('takes the offer wording from the coupon rather than hardcoding it', async () => {
      coupons.getFeatured.mockResolvedValue({ ...FEATURED, value: 50, code: 'SATURDAY50' });
      repo.findEligibleUsers.mockResolvedValueOnce([user(1)]).mockResolvedValue([]);

      await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ offerLabel: '50% OFF', couponCode: 'SATURDAY50' }),
      );
    });

    it('greets the user by name', async () => {
      repo.findEligibleUsers.mockResolvedValueOnce([user(1)]).mockResolvedValue([]);

      await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ userName: 'User 1' }),
      );
    });

    it('falls back to "there" rather than the email local-part', async () => {
      repo.findEligibleUsers.mockResolvedValueOnce([user(1, { full_name: null })]).mockResolvedValue([]);

      await service.run({ dryRun: false });

      expect(email.sendWeekendOffer).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ userName: 'there' }),
      );
    });

    it('points the CTA at the API click tracker, not the web app', async () => {
      repo.findEligibleUsers.mockResolvedValueOnce([user(1)]).mockResolvedValue([]);

      await service.run({ dryRun: false });

      const vars = email.sendWeekendOffer.mock.calls[0][1];
      // The route lives behind the API's api/v1 prefix; the web host would 404.
      expect(vars.upgradeUrl).toContain('https://api.autoclipr.com/api/v1/campaign-click');
      expect(vars.upgradeUrl).toContain('c=camp-1');
    });
  });

  describe('dry run', () => {
    it('counts without sending or claiming', async () => {
      repo.findEligibleUsers.mockResolvedValueOnce([user(1), user(2)]).mockResolvedValue([]);

      const result = await service.run({ dryRun: true });

      expect(email.sendWeekendOffer).not.toHaveBeenCalled();
      expect(repo.claimRecipients).not.toHaveBeenCalled();
      expect(repo.findOrCreateForDate).not.toHaveBeenCalled();
      expect(result).toMatchObject({ dryRun: true, claimed: 2, couponCode: 'SATURDAY25' });
    });
  });

  describe('scheduledRun', () => {
    it('does nothing while disabled', async () => {
      settings['campaigns.saturdayEnabled'] = false;

      await service.scheduledRun();

      expect(coupons.getFeatured).not.toHaveBeenCalled();
    });

    it('swallows failures so the scheduler survives', async () => {
      coupons.getFeatured.mockRejectedValue(new Error('db down'));

      await expect(service.scheduledRun()).resolves.toBeUndefined();
      expect(service['logger'].error).toHaveBeenCalledWith(expect.stringContaining('db down'));
    });
  });

  describe('click tracking', () => {
    it('records a click', async () => {
      await service.recordClick('camp-1', 'u1');

      expect(repo.markClicked).toHaveBeenCalledWith('camp-1', 'u1');
    });

    it('never throws — the user is waiting on a redirect', async () => {
      repo.markClicked.mockRejectedValue(new Error('write failed'));

      await expect(service.recordClick('camp-1', 'u1')).resolves.toBeUndefined();
    });
  });

  describe('stats', () => {
    it('computes a conversion rate against sends', async () => {
      repo.getStats.mockResolvedValue({
        recipients: 12_450, sent: 12_450, delivered: 12_180,
        opened: 4_821, clicked: 1_203, redeemed: 287, converted: 241,
      });

      await expect(service.getStats('camp-1')).resolves.toMatchObject({ conversionRate: 1.94 });
    });

    it('reports zero rather than dividing by zero', async () => {
      repo.getStats.mockResolvedValue({
        recipients: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, redeemed: 0, converted: 0,
      });

      await expect(service.getStats('camp-1')).resolves.toMatchObject({ conversionRate: 0 });
    });
  });
});
