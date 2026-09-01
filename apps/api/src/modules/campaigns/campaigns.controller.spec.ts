import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { createHmac } from 'crypto';
import {
  AdminCampaignsController,
  CampaignClickController,
  EmailWebhookController,
} from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

const SECRET = 'whsec_' + Buffer.from('super-secret-key').toString('base64');

/** A correctly signed Svix header for the given payload. */
function sign(id: string, ts: string, payload: unknown): string {
  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const sig = createHmac('sha256', key)
    .update(`${id}.${ts}.${JSON.stringify(payload)}`)
    .digest('base64');
  return `v1,${sig}`;
}

describe('Campaign controllers', () => {
  let admin: AdminCampaignsController;
  let click: CampaignClickController;
  let hook: EmailWebhookController;
  let service: jest.Mocked<CampaignsService>;
  const res = { redirect: jest.fn() } as never;

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({ sent: 10, conversionRate: 2 }),
      run: jest.fn().mockResolvedValue({ dryRun: false, sent: 5 }),
      recordClick: jest.fn().mockResolvedValue(undefined),
      recordProviderEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CampaignsService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminCampaignsController, CampaignClickController, EmailWebhookController],
      providers: [
        { provide: CampaignsService, useValue: service },
        {
          provide: ConfigService,
          // Key-aware: a blanket string would be picked up as the webhook
          // secret and quietly break signature verification.
          useValue: {
            get: (key: string) =>
              key === 'webAppUrl' ? 'https://autoclipr.com' : undefined,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
      .compile();

    admin = moduleRef.get(AdminCampaignsController);
    click = moduleRef.get(CampaignClickController);
    hook = moduleRef.get(EmailWebhookController);
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    (res as unknown as { redirect: jest.Mock }).redirect.mockClear();
  });

  it('guards every admin route at the class level', () => {
    const guards = Reflect.getMetadata('__guards__', AdminCampaignsController) ?? [];
    expect(guards).toEqual([JwtAuthGuard, AdminGuard]);
  });

  it('lists campaigns', async () => {
    await admin.list();
    expect(service.list).toHaveBeenCalled();
  });

  it('returns campaign stats', async () => {
    const r = await admin.stats('c1');
    expect(service.getStats).toHaveBeenCalledWith('c1');
    expect(r.data).toMatchObject({ conversionRate: 2 });
  });

  it('previews without sending', async () => {
    await admin.preview();
    expect(service.run).toHaveBeenCalledWith({ dryRun: true });
  });

  it('runs the campaign', async () => {
    await admin.run();
    expect(service.run).toHaveBeenCalledWith({ dryRun: false });
  });

  describe('click tracking', () => {
    it('records the click and redirects to the target', async () => {
      await click.click('c1', 'u1', '/pricing?coupon=SATURDAY25', res);

      expect(service.recordClick).toHaveBeenCalledWith('c1', 'u1');
      expect((res as unknown as { redirect: jest.Mock }).redirect).toHaveBeenCalledWith(
        'https://autoclipr.com/pricing?coupon=SATURDAY25',
      );
    });

    it.each([
      ['https://evil.example.com/phish'],
      ['//evil.example.com'],
      ['javascript:alert(1)'],
      [''],
    ])('refuses to redirect to %s', async (next) => {
      await click.click('c1', 'u1', next, res);

      // An unrestricted `next` would make this an open redirect wearing our
      // domain — ideal for phishing.
      expect((res as unknown as { redirect: jest.Mock }).redirect).toHaveBeenCalledWith(
        'https://autoclipr.com/pricing',
      );
    });

    it('still redirects when tracking parameters are missing', async () => {
      await click.click('', '', '/pricing', res);

      expect(service.recordClick).not.toHaveBeenCalled();
      expect((res as unknown as { redirect: jest.Mock }).redirect).toHaveBeenCalled();
    });
  });

  describe('Resend webhook', () => {
    const body = { type: 'email.delivered', data: { to: 'a@b.com' } };

    afterEach(() => {
      process.env.RESEND_WEBHOOK_SECRET = SECRET;
    });

    it('records a delivery on a correctly signed event', async () => {
      await hook.resend(sign('id1', '123', body), 'id1', '123', body);

      expect(service.recordProviderEvent).toHaveBeenCalledWith('a@b.com', 'delivered');
    });

    it('records an open', async () => {
      const opened = { type: 'email.opened', data: { to: 'a@b.com' } };
      await hook.resend(sign('id1', '123', opened), 'id1', '123', opened);

      expect(service.recordProviderEvent).toHaveBeenCalledWith('a@b.com', 'opened');
    });

    it('takes the first address when `to` is a list', async () => {
      const many = { type: 'email.delivered', data: { to: ['x@y.com', 'z@y.com'] } };
      await hook.resend(sign('id1', '123', many), 'id1', '123', many);

      expect(service.recordProviderEvent).toHaveBeenCalledWith('x@y.com', 'delivered');
    });

    it('rejects a forged signature', async () => {
      // An unauthenticated endpoint that writes analytics is one anyone can
      // use to fabricate them.
      await expect(hook.resend('v1,bogus', 'id1', '123', body)).rejects.toThrow(
        'Invalid webhook signature',
      );
      expect(service.recordProviderEvent).not.toHaveBeenCalled();
    });

    it('rejects a signature computed over a different payload', async () => {
      const good = sign('id1', '123', { type: 'email.delivered', data: { to: 'other@b.com' } });

      await expect(hook.resend(good, 'id1', '123', body)).rejects.toThrow(
        'Invalid webhook signature',
      );
    });

    it.each([['id'], ['timestamp'], ['signature']])('rejects a missing %s', async (missing) => {
      const sig = missing === 'signature' ? '' : sign('id1', '123', body);
      await expect(
        hook.resend(sig, missing === 'id' ? '' : 'id1', missing === 'timestamp' ? '' : '123', body),
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('fails closed when no secret is configured', async () => {
      delete process.env.RESEND_WEBHOOK_SECRET;

      await expect(hook.resend('v1,x', 'id1', '123', body)).rejects.toThrow(
        'Webhook secret not configured',
      );
    });

    it('ignores an event with no recipient', async () => {
      const noTo = { type: 'email.delivered', data: {} };
      const result = await hook.resend(sign('id1', '123', noTo), 'id1', '123', noTo);

      expect(result).toEqual({ received: true });
      expect(service.recordProviderEvent).not.toHaveBeenCalled();
    });

    it('acknowledges an event type it does not track', async () => {
      const other = { type: 'email.bounced', data: { to: 'a@b.com' } };
      const result = await hook.resend(sign('id1', '123', other), 'id1', '123', other);

      expect(result).toEqual({ received: true });
      expect(service.recordProviderEvent).not.toHaveBeenCalled();
    });
  });
});
