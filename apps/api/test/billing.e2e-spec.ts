// jwt-auth.guard.ts (transitively imported via BillingController's per-route @UseGuards)
// pulls in the ESM-only `jose` package, which Jest's CommonJS transform can't parse from
// node_modules. We stub it out — see MockJwtAuthGuard below.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { BadRequestException, ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { InvoicePdfService } from '@autoclipr/emails';
import { BillingController } from '../src/modules/billing/billing.controller';
import { DodoService } from '../src/modules/billing/dodo.service';
import { SubscriptionsService } from '../src/modules/billing/subscriptions.service';
import { UsersService } from '../src/modules/users/users.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

class MockJwtAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'];
    if (!auth || auth !== 'Bearer valid-token') {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }
    req.user = { sub: 'user-1', email: 'jane@example.com' };
    return true;
  }
}

describe('BillingController (e2e)', () => {
  let app: INestApplication;
  let usersService: jest.Mocked<UsersService>;
  let dodo: jest.Mocked<DodoService>;
  let subscriptions: jest.Mocked<SubscriptionsService>;
  let invoicePdf: jest.Mocked<InvoicePdfService>;

  beforeAll(async () => {
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
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/billing/subscription', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer()).get('/api/v1/billing/subscription').expect(401);
    });

    it('returns the wrapped billing info for an authenticated user', async () => {
      const billing = { profile: {}, subscription: null, credits: 10 };
      usersService.getBilling.mockResolvedValue(billing as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/billing/subscription')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(usersService.getBilling).toHaveBeenCalledWith('user-1');
      expect(response.body).toEqual({ success: true, data: billing });
    });
  });

  describe('GET /api/v1/plans', () => {
    it('is public — returns 200 with no Authorization header', async () => {
      usersService.listPlans.mockResolvedValue([{ id: 'starter' }] as any);

      const response = await request(app.getHttpServer()).get('/api/v1/plans').expect(200);

      expect(response.body).toEqual({ success: true, data: [{ id: 'starter' }] });
    });
  });

  describe('POST /api/v1/billing/checkout', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/billing/checkout')
        .send({ planId: 'creator' })
        .expect(401);
    });

    it('creates a checkout session and returns the wrapped URL', async () => {
      subscriptions.createCheckoutUrl.mockResolvedValue('https://pay.dodo/session');

      const response = await request(app.getHttpServer())
        .post('/api/v1/billing/checkout')
        .set('Authorization', 'Bearer valid-token')
        .send({ planId: 'creator', billingPeriod: 'yearly' })
        .expect(201);

      expect(subscriptions.createCheckoutUrl).toHaveBeenCalledWith('user-1', 'jane@example.com', 'creator', 'yearly');
      expect(response.body).toEqual({ success: true, data: { url: 'https://pay.dodo/session' } });
    });

    it('returns 400 when planId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/billing/checkout')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(subscriptions.createCheckoutUrl).not.toHaveBeenCalled();
    });

    it('returns 400 when the service rejects the checkout (e.g. unresolvable email)', async () => {
      subscriptions.createCheckoutUrl.mockRejectedValue(new BadRequestException('Could not determine user email for checkout'));

      await request(app.getHttpServer())
        .post('/api/v1/billing/checkout')
        .set('Authorization', 'Bearer valid-token')
        .send({ planId: 'creator' })
        .expect(400);
    });
  });

  describe('GET /api/v1/billing/transactions', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer()).get('/api/v1/billing/transactions').expect(401);
    });

    it('returns the wrapped transaction list', async () => {
      subscriptions.getTransactions.mockResolvedValue([{ id: 'tx-1' }] as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/billing/transactions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(subscriptions.getTransactions).toHaveBeenCalledWith('user-1');
      expect(response.body).toEqual({ success: true, data: [{ id: 'tx-1' }] });
    });
  });

  describe('GET /api/v1/billing/invoice/download', () => {
    it('is public and streams back a PDF with no Authorization header', async () => {
      invoicePdf.generate.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));

      const response = await request(app.getHttpServer())
        .get('/api/v1/billing/invoice/download')
        .query({ invoiceNumber: 'INV-1', plan: 'Creator', amount: '₹399.00', date: '1 Jan 2026', name: 'Jane', txId: 'TXN-1' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toBe('attachment; filename="autoclipr-invoice-INV-1.pdf"');
      expect(invoicePdf.generate).toHaveBeenCalledWith(
        expect.objectContaining({ invoiceNumber: 'INV-1', planName: 'Creator', transactionId: 'TXN-1' }),
      );
    });
  });

  describe('POST /api/v1/billing/activate', () => {
    it('returns 401 without a valid Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/billing/activate')
        .send({ planId: 'creator' })
        .expect(401);
    });

    it('activates the plan and returns activated:true', async () => {
      subscriptions.activatePlanForUser.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/api/v1/billing/activate')
        .set('Authorization', 'Bearer valid-token')
        .send({ planId: 'creator', transactionId: 'txn-1', billingPeriod: 'yearly' })
        .expect(201);

      expect(subscriptions.activatePlanForUser).toHaveBeenCalledWith(
        'user-1',
        'creator',
        'jane@example.com',
        'txn-1',
        'yearly',
      );
      expect(response.body).toEqual({ success: true, data: { activated: true } });
    });

    it('returns 400 when planId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/billing/activate')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);
    });

    it('returns 500 when the service rejects an unknown plan', async () => {
      subscriptions.activatePlanForUser.mockRejectedValue(new Error('Unknown plan: bogus'));

      await request(app.getHttpServer())
        .post('/api/v1/billing/activate')
        .set('Authorization', 'Bearer valid-token')
        .send({ planId: 'bogus', transactionId: 'txn-1', billingPeriod: 'yearly' })
        .expect(500);
    });
  });

  describe('POST /api/v1/webhooks/dodo', () => {
    it('is public and processes the event with no Authorization header', async () => {
      dodo.verifyWebhook.mockReturnValue({ event_type: 'subscription.active', data: {} });
      subscriptions.handleWebhookEvent.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks/dodo')
        .send({ event_type: 'subscription.active', data: {} })
        .expect(200);

      expect(subscriptions.handleWebhookEvent).toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });

    it('still returns 200 and processes the raw body when signature verification throws', async () => {
      dodo.verifyWebhook.mockImplementation(() => {
        throw new Error('bad signature');
      });
      subscriptions.handleWebhookEvent.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks/dodo')
        .send({ event_type: 'subscription.cancelled' })
        .expect(200);

      expect(subscriptions.handleWebhookEvent).toHaveBeenCalledWith({ event_type: 'subscription.cancelled' });
      expect(response.body).toEqual({ received: true });
    });
  });
});
