import { AffiliatesController } from './affiliates.controller';
import { AffiliatesService } from './affiliates.service';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

function makeService(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    sendInquiryConfirmation: jest.fn().mockResolvedValue(undefined),
    apply: jest.fn().mockResolvedValue({ id: 'a1' }),
    getMyDashboard: jest.fn().mockResolvedValue({ affiliate: { id: 'a1' } }),
    trackSignup: jest.fn().mockResolvedValue(undefined),
    requestPayout: jest.fn().mockResolvedValue({ id: 'p1' }),
    ...overrides,
  } as unknown as AffiliatesService;
}

const user: AuthUser = { sub: 'u1', email: 'u1@x.com' };

describe('AffiliatesController', () => {
  it('inquire calls sendInquiryConfirmation and returns received:true', async () => {
    const service = makeService();
    const controller = new AffiliatesController(service);
    const result = await controller.inquire({ email: 'a@b.com', channelUrl: 'https://yt' });
    expect(service.sendInquiryConfirmation).toHaveBeenCalledWith('a@b.com', 'https://yt');
    expect(result).toEqual({ success: true, data: { received: true }, meta: undefined });
  });

  it('apply forwards the current user id and dto fields to the service', async () => {
    const service = makeService();
    const controller = new AffiliatesController(service);
    const result = await controller.apply(user, { email: 'a@b.com', channelUrl: 'https://yt' });
    expect(service.apply).toHaveBeenCalledWith('u1', 'a@b.com', 'https://yt');
    expect(result).toEqual({ success: true, data: { id: 'a1' }, meta: undefined });
  });

  it('me returns the current user dashboard', async () => {
    const service = makeService();
    const controller = new AffiliatesController(service);
    const result = await controller.me(user);
    expect(service.getMyDashboard).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ success: true, data: { affiliate: { id: 'a1' } }, meta: undefined });
  });

  it('trackSignup forwards refCode and user id', async () => {
    const service = makeService();
    const controller = new AffiliatesController(service);
    const result = await controller.trackSignup(user, { refCode: 'abc123' });
    expect(service.trackSignup).toHaveBeenCalledWith('abc123', 'u1');
    expect(result).toEqual({ success: true, data: { tracked: true }, meta: undefined });
  });

  describe('requestPayout', () => {
    it('forwards amount/method/details to the service', async () => {
      const service = makeService();
      const controller = new AffiliatesController(service);
      const result = await controller.requestPayout(user, {
        amountPaise: 150000,
        method: 'upi',
        details: 'user@upi',
      });
      expect(service.requestPayout).toHaveBeenCalledWith('u1', 150000, 'upi', 'user@upi');
      expect(result).toEqual({ success: true, data: { id: 'p1' }, meta: undefined });
    });

    it('defaults details to an empty string when omitted', async () => {
      const service = makeService();
      const controller = new AffiliatesController(service);
      await controller.requestPayout(user, { amountPaise: 150000, method: 'upi' });
      expect(service.requestPayout).toHaveBeenCalledWith('u1', 150000, 'upi', '');
    });
  });
});
