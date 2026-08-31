// jwt-auth.guard.ts (transitively imported via BillingController's @UseGuards) pulls in the
// ESM-only `jose` package, which Jest's CommonJS transform can't parse from node_modules.
// We never exercise real JWT verification in this unit test, so stub the module out.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InvoicePdfService } from '@autoclipr/emails';
import { BillingController } from './billing.controller';
import { DodoService } from './dodo.service';
import { SubscriptionsService } from './subscriptions.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';

describe('BillingController', () => {
  let controller: BillingController;
  let usersService: jest.Mocked<UsersService>;
  let dodo: jest.Mocked<DodoService>;
  let subscriptions: jest.Mocked<SubscriptionsService>;
  let invoicePdf: jest.Mocked<InvoicePdfService>;

  const user: AuthUser = { sub: 'user-1', email: 'jane@example.com' };

  beforeEach(async () => {
    usersService = {
      getBilling: jest.fn(),
      listPlans: jest.fn(),
      getMe: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    dodo = { verifyWebhook: jest.fn() } as unknown as jest.Mocked<DodoService>;

    subscriptions = {
      createCheckoutUrl: jest.fn(),
      getTransactions: jest.fn(),
      activatePlanForUser: jest.fn(),
      handleWebhookEvent: jest.fn(),
      logger: { log: jest.fn() },
    } as unknown as jest.Mocked<SubscriptionsService>;

    invoicePdf = { generate: jest.fn() } as unknown as jest.Mocked<InvoicePdfService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: DodoService, useValue: dodo },
        { provide: SubscriptionsService, useValue: subscriptions },
        { provide: InvoicePdfService, useValue: invoicePdf },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = moduleRef.get(BillingController);
  });

  describe('subscription', () => {
    it('returns the wrapped billing info for the current user', async () => {
      const billing = { profile: {}, subscription: null, credits: 10 };
      usersService.getBilling.mockResolvedValue(billing as any);

      const result = await controller.subscription(user);

      expect(usersService.getBilling).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true, data: billing, meta: undefined });
    });
  });

  describe('plans', () => {
    it('returns the wrapped plan list', async () => {
      usersService.listPlans.mockResolvedValue([{ id: 'starter' }] as any);

      const result = await controller.plans();

      expect(result).toEqual({ success: true, data: [{ id: 'starter' }], meta: undefined });
    });
  });

  describe('checkout', () => {
    it('uses the email from the JWT when present', async () => {
      subscriptions.createCheckoutUrl.mockResolvedValue('https://pay.dodo/session');

      const result = await controller.checkout(user, { planId: 'creator', billingPeriod: 'yearly' });

      expect(usersService.getMe).not.toHaveBeenCalled();
      expect(subscriptions.createCheckoutUrl).toHaveBeenCalledWith('user-1', 'jane@example.com', 'creator', 'yearly', undefined);
      expect(result).toEqual({ success: true, data: { url: 'https://pay.dodo/session' }, meta: undefined });
    });

    it('defaults billingPeriod to yearly when omitted', async () => {
      subscriptions.createCheckoutUrl.mockResolvedValue('https://pay.dodo/session');

      await controller.checkout(user, { planId: 'creator' } as any);

      expect(subscriptions.createCheckoutUrl).toHaveBeenCalledWith('user-1', 'jane@example.com', 'creator', 'yearly', undefined);
    });

    it('falls back to the profile email when the JWT has none', async () => {
      const userWithoutEmail: AuthUser = { sub: 'user-2' };
      usersService.getMe.mockResolvedValue({ email: 'profile@example.com' } as any);
      subscriptions.createCheckoutUrl.mockResolvedValue('https://pay.dodo/session');

      await controller.checkout(userWithoutEmail, { planId: 'creator', billingPeriod: 'monthly' });

      expect(usersService.getMe).toHaveBeenCalledWith('user-2');
      expect(subscriptions.createCheckoutUrl).toHaveBeenCalledWith(
        'user-2',
        'profile@example.com',
        'creator',
        'monthly',
        undefined,
      );
    });

    it('throws BadRequestException when no email can be resolved at all', async () => {
      const userWithoutEmail: AuthUser = { sub: 'user-2' };
      usersService.getMe.mockRejectedValue(new Error('not found'));

      await expect(
        controller.checkout(userWithoutEmail, { planId: 'creator', billingPeriod: 'monthly' }),
      ).rejects.toThrow(BadRequestException);
      expect(subscriptions.createCheckoutUrl).not.toHaveBeenCalled();
    });
  });

  describe('transactions', () => {
    it('returns the wrapped transaction list', async () => {
      subscriptions.getTransactions.mockResolvedValue([{ id: 'tx-1' }] as any);

      const result = await controller.transactions(user);

      expect(subscriptions.getTransactions).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true, data: [{ id: 'tx-1' }], meta: undefined });
    });
  });

  describe('downloadInvoice', () => {
    it('generates a PDF and streams it with the correct headers', async () => {
      const pdfBuffer = Buffer.from('pdf-bytes');
      invoicePdf.generate.mockResolvedValue(pdfBuffer);
      const res = { set: jest.fn(), end: jest.fn() } as any;

      await controller.downloadInvoice(
        'INV-1',
        'Creator',
        '₹399.00',
        '1 Jan 2026',
        'Jane Doe',
        'TXN-1',
        res,
      );

      expect(invoicePdf.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: 'INV-1',
          transactionId: 'TXN-1',
          planName: 'Creator',
          amount: '₹399.00',
          userName: 'Jane Doe',
        }),
      );
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="autoclipr-invoice-INV-1.pdf"',
          'Content-Length': pdfBuffer.length,
        }),
      );
      expect(res.end).toHaveBeenCalledWith(pdfBuffer);
    });

    it('applies fallback defaults for missing query params', async () => {
      invoicePdf.generate.mockResolvedValue(Buffer.from('x'));
      const res = { set: jest.fn(), end: jest.fn() } as any;

      await controller.downloadInvoice(undefined as any, undefined as any, undefined as any, undefined as any, undefined as any, undefined as any, res);

      expect(invoicePdf.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: 'N/A',
          transactionId: '-',
          planName: 'Creator',
          amount: '₹349.00',
          userName: 'Customer',
        }),
      );
    });
  });

  describe('activatePlan', () => {
    it('activates the plan for the current user', async () => {
      subscriptions.activatePlanForUser.mockResolvedValue(undefined);

      const result = await controller.activatePlan(user, {
        planId: 'creator',
        transactionId: 'txn-1',
        billingPeriod: 'yearly',
      });

      expect(subscriptions.activatePlanForUser).toHaveBeenCalledWith(
        'user-1',
        'creator',
        'jane@example.com',
        'txn-1',
        'yearly',
      );
      expect(result).toEqual({ success: true, data: { activated: true }, meta: undefined });
    });

    it('defaults billingPeriod to yearly when omitted', async () => {
      subscriptions.activatePlanForUser.mockResolvedValue(undefined);

      await controller.activatePlan(user, { planId: 'creator' } as any);

      expect(subscriptions.activatePlanForUser).toHaveBeenCalledWith(
        'user-1',
        'creator',
        'jane@example.com',
        undefined,
        'yearly',
      );
    });

    it('propagates errors from the service', async () => {
      subscriptions.activatePlanForUser.mockRejectedValue(new Error('unknown plan'));

      await expect(controller.activatePlan(user, { planId: 'bogus' } as any)).rejects.toThrow('unknown plan');
    });
  });

  describe('dodoWebhook', () => {
    function makeRequest(body: any, rawBody?: string) {
      return {
        rawBody: rawBody !== undefined ? Buffer.from(rawBody) : undefined,
        body,
        headers: { 'webhook-signature': 'sig', 'content-length': 123 as any },
      } as any;
    }

    it('verifies the webhook signature and processes the parsed event', async () => {
      const req = makeRequest({ event_type: 'subscription.active' }, '{"event_type":"subscription.active"}');
      dodo.verifyWebhook.mockReturnValue({ event_type: 'subscription.active', data: {} });

      const result = await controller.dodoWebhook(req);

      expect(dodo.verifyWebhook).toHaveBeenCalledWith(
        '{"event_type":"subscription.active"}',
        expect.objectContaining({ 'webhook-signature': 'sig' }),
      );
      expect(subscriptions.handleWebhookEvent).toHaveBeenCalledWith({ event_type: 'subscription.active', data: {} });
      expect(result).toEqual({ received: true });
    });

    it('only forwards string-valued headers to verifyWebhook', async () => {
      const req = makeRequest({}, '{}');
      dodo.verifyWebhook.mockReturnValue({ event_type: 'x' });

      await controller.dodoWebhook(req);

      const headersArg = dodo.verifyWebhook.mock.calls[0][1];
      expect(headersArg).toEqual({ 'webhook-signature': 'sig' });
      expect(headersArg).not.toHaveProperty('content-length');
    });

    it('rejects the request with 401 when signature verification throws, instead of trusting the unverified body', async () => {
      const req = makeRequest({ event_type: 'subscription.active', data: { metadata: { plan_id: 'business' } } }, 'forged-payload');
      dodo.verifyWebhook.mockImplementation(() => {
        throw new Error('bad signature');
      });

      await expect(controller.dodoWebhook(req)).rejects.toThrow('Invalid webhook signature');
      expect(subscriptions.handleWebhookEvent).not.toHaveBeenCalled();
    });

    it('stringifies req.body when rawBody is unavailable', async () => {
      const req = makeRequest({ event_type: 'subscription.active' }, undefined);
      dodo.verifyWebhook.mockReturnValue({ event_type: 'subscription.active' });

      await controller.dodoWebhook(req);

      expect(dodo.verifyWebhook).toHaveBeenCalledWith(
        JSON.stringify({ event_type: 'subscription.active' }),
        expect.anything(),
      );
    });
  });
});
