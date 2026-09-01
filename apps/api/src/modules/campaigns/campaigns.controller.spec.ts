import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminCampaignsController, CampaignClickController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

describe('Campaign controllers', () => {
  let admin: AdminCampaignsController;
  let click: CampaignClickController;
  let service: jest.Mocked<CampaignsService>;
  const res = { redirect: jest.fn() } as never;

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({ sent: 10, conversionRate: 2 }),
      run: jest.fn().mockResolvedValue({ dryRun: false, sent: 5 }),
      recordClick: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CampaignsService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminCampaignsController, CampaignClickController],
      providers: [
        { provide: CampaignsService, useValue: service },
        { provide: ConfigService, useValue: { get: () => 'https://autoclipr.com' } },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
      .compile();

    admin = moduleRef.get(AdminCampaignsController);
    click = moduleRef.get(CampaignClickController);
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
});
