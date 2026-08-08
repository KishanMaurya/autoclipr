const mockSubscriptionsCreate = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();
const mockSubscriptionsUpdate = jest.fn();
const mockWebhooksUnwrap = jest.fn();

const MockDodoPayments = jest.fn().mockImplementation(() => ({
  subscriptions: {
    create: mockSubscriptionsCreate,
    retrieve: mockSubscriptionsRetrieve,
    update: mockSubscriptionsUpdate,
  },
  webhooks: {
    unwrap: mockWebhooksUnwrap,
  },
}));

jest.mock('dodopayments', () => MockDodoPayments);

// dodo.service.ts computes its PRODUCT_IDS map from process.env at *module load* time,
// so these must be set before the module is first require()'d below (TypeScript's
// CommonJS emit preserves source order between plain statements and import declarations).
process.env.DODO_PRODUCT_CREATOR_MONTHLY = 'prod_creator_monthly';
process.env.DODO_PRODUCT_CREATOR_YEARLY = 'prod_creator_yearly';
process.env.DODO_PRODUCT_BUSINESS_MONTHLY = 'prod_business_monthly';
process.env.DODO_PRODUCT_BUSINESS_YEARLY = 'prod_business_yearly';

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DodoService } from './dodo.service';

describe('DodoService', () => {
  let service: DodoService;
  let config: jest.Mocked<ConfigService>;

  const configValues: Record<string, string> = {
    DODO_API_KEY: 'test-key',
    DODO_LIVE_MODE: 'false',
    DODO_WEBHOOK_SECRET: 'whsec_test',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    config = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as jest.Mocked<ConfigService>;

    const moduleRef = await Test.createTestingModule({
      providers: [DodoService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = moduleRef.get(DodoService);
  });

  it('constructs the Dodo client in test_mode when DODO_LIVE_MODE is not "true"', () => {
    expect(MockDodoPayments).toHaveBeenCalledWith({ bearerToken: 'test-key', environment: 'test_mode' });
  });

  it('constructs the Dodo client in live_mode when DODO_LIVE_MODE is "true"', async () => {
    configValues.DODO_LIVE_MODE = 'true';
    const moduleRef = await Test.createTestingModule({
      providers: [DodoService, { provide: ConfigService, useValue: config }],
    }).compile();
    moduleRef.get(DodoService);

    expect(MockDodoPayments).toHaveBeenCalledWith({ bearerToken: 'test-key', environment: 'live_mode' });
    configValues.DODO_LIVE_MODE = 'false';
  });

  it('defaults bearerToken to an empty string when DODO_API_KEY is unset', async () => {
    const sparseConfig = { get: jest.fn(() => undefined) } as unknown as jest.Mocked<ConfigService>;
    const moduleRef = await Test.createTestingModule({
      providers: [DodoService, { provide: ConfigService, useValue: sparseConfig }],
    }).compile();
    moduleRef.get(DodoService);

    expect(MockDodoPayments).toHaveBeenCalledWith({ bearerToken: '', environment: 'test_mode' });
  });

  describe('createCheckoutUrl', () => {
    it('throws for an unknown plan id', async () => {
      await expect(
        service.createCheckoutUrl({
          planId: 'nonexistent',
          billingPeriod: 'yearly',
          userId: 'user-1',
          email: 'jane@example.com',
          successUrl: 'https://app/success',
          cancelUrl: 'https://app/cancel',
        }),
      ).rejects.toThrow('Unknown plan: nonexistent');
    });

    it('throws for the starter plan, which has no configured product ids', async () => {
      await expect(
        service.createCheckoutUrl({
          planId: 'starter',
          billingPeriod: 'yearly',
          userId: 'user-1',
          email: 'jane@example.com',
          successUrl: 'https://app/success',
          cancelUrl: 'https://app/cancel',
        }),
      ).rejects.toThrow('No product configured for starter yearly');
    });

    it('creates a subscription session and embeds the subscription id into the returned success URL', async () => {
      // Dodo's real payment_link embeds the return_url (URL-encoded) as a query param;
      // the service finds that encoded occurrence and appends &subscription_id=<id> to it.
      const encodedSuccess = encodeURIComponent('https://app/success');
      mockSubscriptionsCreate.mockResolvedValue({
        payment_link: `https://pay.dodo/abc?return_url=${encodedSuccess}`,
        subscription_id: 'sub_123',
      });

      const url = await service.createCheckoutUrl({
        planId: 'creator',
        billingPeriod: 'yearly',
        userId: 'user-1',
        email: 'jane@example.com',
        successUrl: 'https://app/success',
        cancelUrl: 'https://app/cancel',
      });

      expect(mockSubscriptionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: { email: 'jane@example.com', name: 'jane@example.com' },
          quantity: 1,
          payment_link: true,
          return_url: 'https://app/success',
          metadata: { user_id: 'user-1', plan_id: 'creator', billing_period: 'yearly' },
        }),
      );
      expect(url).toContain(encodeURIComponent('https://app/success&subscription_id=sub_123'));
    });

    it('falls back to the `id` field for the subscription id when subscription_id is absent', async () => {
      const encodedSuccess = encodeURIComponent('https://app/success');
      mockSubscriptionsCreate.mockResolvedValue({
        url: `https://pay.dodo/xyz?return_url=${encodedSuccess}`,
        id: 'sub_456',
      });

      const url = await service.createCheckoutUrl({
        planId: 'business',
        billingPeriod: 'monthly',
        userId: 'user-1',
        email: 'jane@example.com',
        successUrl: 'https://app/success',
        cancelUrl: 'https://app/cancel',
      });

      expect(url).toContain(encodeURIComponent('https://app/success&subscription_id=sub_456'));
    });

    it('returns the raw url unchanged when the SDK response has no subscription/session id', async () => {
      mockSubscriptionsCreate.mockResolvedValue({ payment_link: 'https://pay.dodo/no-id' });

      const url = await service.createCheckoutUrl({
        planId: 'creator',
        billingPeriod: 'monthly',
        userId: 'user-1',
        email: 'jane@example.com',
        successUrl: 'https://app/success',
        cancelUrl: 'https://app/cancel',
      });

      expect(url).toBe('https://pay.dodo/no-id');
    });

    it('throws when Dodo does not return a payment URL', async () => {
      mockSubscriptionsCreate.mockResolvedValue({});

      await expect(
        service.createCheckoutUrl({
          planId: 'creator',
          billingPeriod: 'monthly',
          userId: 'user-1',
          email: 'jane@example.com',
          successUrl: 'https://app/success',
          cancelUrl: 'https://app/cancel',
        }),
      ).rejects.toThrow('Dodo did not return a payment URL');
    });
  });

  describe('getSubscription', () => {
    it('retrieves the subscription by id', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({ id: 'sub_123', status: 'active' });

      const result = await service.getSubscription('sub_123');

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_123');
      expect(result).toEqual({ id: 'sub_123', status: 'active' });
    });
  });

  describe('cancelSubscription', () => {
    it('updates the subscription status to cancelled', async () => {
      mockSubscriptionsUpdate.mockResolvedValue({ id: 'sub_123', status: 'cancelled' });

      const result = await service.cancelSubscription('sub_123');

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_123', { status: 'cancelled' });
      expect(result).toEqual({ id: 'sub_123', status: 'cancelled' });
    });
  });

  describe('verifyWebhook', () => {
    it('unwraps the webhook payload using the configured secret', () => {
      mockWebhooksUnwrap.mockReturnValue({ event_type: 'subscription.active' });

      const result = service.verifyWebhook('{"raw":"body"}', { 'webhook-signature': 'sig' });

      expect(mockWebhooksUnwrap).toHaveBeenCalledWith('{"raw":"body"}', {
        headers: { 'webhook-signature': 'sig' },
        key: 'whsec_test',
      });
      expect(result).toEqual({ event_type: 'subscription.active' });
    });

    it('defaults the webhook key to an empty string when DODO_WEBHOOK_SECRET is unset', async () => {
      const sparseConfig = { get: jest.fn(() => undefined) } as unknown as jest.Mocked<ConfigService>;
      const moduleRef = await Test.createTestingModule({
        providers: [DodoService, { provide: ConfigService, useValue: sparseConfig }],
      }).compile();
      const sparseService = moduleRef.get(DodoService);
      mockWebhooksUnwrap.mockReturnValue({ event_type: 'subscription.active' });

      sparseService.verifyWebhook('{"raw":"body"}', {});

      expect(mockWebhooksUnwrap).toHaveBeenCalledWith('{"raw":"body"}', { headers: {}, key: '' });
    });
  });
});
