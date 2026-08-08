import { BadRequestException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AffiliatesController } from '../src/modules/affiliates/affiliates.controller';
import { AffiliatesService } from '../src/modules/affiliates/affiliates.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { makeStubConfigService, signTestToken } from './jwt-test-helper';

describe('AffiliatesController (e2e)', () => {
  let app: INestApplication;
  const affiliatesService = {
    sendInquiryConfirmation: jest.fn(),
    apply: jest.fn(),
    getMyDashboard: jest.fn(),
    trackSignup: jest.fn(),
    requestPayout: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AffiliatesController],
      providers: [
        { provide: AffiliatesService, useValue: affiliatesService },
        JwtAuthGuard,
        Reflector,
        { provide: ConfigService, useValue: makeStubConfigService() },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /affiliates/inquire (public)', () => {
    it('succeeds without an Authorization header', async () => {
      affiliatesService.sendInquiryConfirmation.mockResolvedValue(undefined);
      const res = await request(app.getHttpServer())
        .post('/affiliates/inquire')
        .send({ email: 'a@b.com', channelUrl: 'https://yt.com/x' })
        .expect(200);
      expect(res.body).toEqual({ success: true, data: { received: true } });
      expect(affiliatesService.sendInquiryConfirmation).toHaveBeenCalledWith('a@b.com', 'https://yt.com/x');
    });

    it('rejects an invalid payload (missing fields)', async () => {
      await request(app.getHttpServer()).post('/affiliates/inquire').send({}).expect(400);
    });
  });

  describe('auth-guarded routes without a token', () => {
    it('POST /affiliates/apply returns 401', async () => {
      await request(app.getHttpServer())
        .post('/affiliates/apply')
        .send({ email: 'a@b.com', channelUrl: 'https://yt' })
        .expect(401);
    });

    it('GET /affiliates/me returns 401', async () => {
      await request(app.getHttpServer()).get('/affiliates/me').expect(401);
    });

    it('POST /affiliates/track-signup returns 401', async () => {
      await request(app.getHttpServer())
        .post('/affiliates/track-signup')
        .send({ refCode: 'abc123' })
        .expect(401);
    });

    it('POST /affiliates/payouts/request returns 401', async () => {
      await request(app.getHttpServer())
        .post('/affiliates/payouts/request')
        .send({ amountPaise: 150000, method: 'upi' })
        .expect(401);
    });
  });

  describe('authenticated', () => {
    let token: string;
    const authHeader = () => `Bearer ${token}`;

    beforeAll(async () => {
      token = await signTestToken({ sub: 'user-1', email: 'user1@x.com' });
    });

    it('POST /affiliates/apply creates the affiliate for the current user', async () => {
      affiliatesService.apply.mockResolvedValue({ id: 'a1' });
      const res = await request(app.getHttpServer())
        .post('/affiliates/apply')
        .set('Authorization', authHeader())
        .send({ email: 'a@b.com', channelUrl: 'https://yt' })
        .expect(201);
      expect(affiliatesService.apply).toHaveBeenCalledWith('user-1', 'a@b.com', 'https://yt');
      expect(res.body).toEqual({ success: true, data: { id: 'a1' } });
    });

    it('POST /affiliates/apply rejects an invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/affiliates/apply')
        .set('Authorization', authHeader())
        .send({ email: 'a@b.com' }) // missing channelUrl
        .expect(400);
    });

    it('GET /affiliates/me returns the dashboard for the current user', async () => {
      affiliatesService.getMyDashboard.mockResolvedValue({ affiliate: { id: 'a1' } });
      const res = await request(app.getHttpServer())
        .get('/affiliates/me')
        .set('Authorization', authHeader())
        .expect(200);
      expect(affiliatesService.getMyDashboard).toHaveBeenCalledWith('user-1');
      expect(res.body).toEqual({ success: true, data: { affiliate: { id: 'a1' } } });
    });

    it('POST /affiliates/track-signup tracks the referral', async () => {
      affiliatesService.trackSignup.mockResolvedValue(undefined);
      const res = await request(app.getHttpServer())
        .post('/affiliates/track-signup')
        .set('Authorization', authHeader())
        .send({ refCode: 'abc123' })
        .expect(201);
      expect(affiliatesService.trackSignup).toHaveBeenCalledWith('abc123', 'user-1');
      expect(res.body).toEqual({ success: true, data: { tracked: true } });
    });

    describe('POST /affiliates/payouts/request', () => {
      it('creates a payout request with valid input', async () => {
        affiliatesService.requestPayout.mockResolvedValue({ id: 'p1' });
        const res = await request(app.getHttpServer())
          .post('/affiliates/payouts/request')
          .set('Authorization', authHeader())
          .send({ amountPaise: 150000, method: 'upi', details: 'user@upi' })
          .expect(201);
        expect(affiliatesService.requestPayout).toHaveBeenCalledWith('user-1', 150000, 'upi', 'user@upi');
        expect(res.body).toEqual({ success: true, data: { id: 'p1' } });
      });

      it('defaults details to an empty string when omitted', async () => {
        affiliatesService.requestPayout.mockResolvedValue({ id: 'p2' });
        await request(app.getHttpServer())
          .post('/affiliates/payouts/request')
          .set('Authorization', authHeader())
          .send({ amountPaise: 150000, method: 'upi' })
          .expect(201);
        expect(affiliatesService.requestPayout).toHaveBeenCalledWith('user-1', 150000, 'upi', '');
      });

      it('rejects amounts below the DTO minimum (100000 paise) with 400', async () => {
        await request(app.getHttpServer())
          .post('/affiliates/payouts/request')
          .set('Authorization', authHeader())
          .send({ amountPaise: 500, method: 'upi' })
          .expect(400);
        expect(affiliatesService.requestPayout).not.toHaveBeenCalled();
      });

      it('rejects a non-numeric amountPaise with 400', async () => {
        await request(app.getHttpServer())
          .post('/affiliates/payouts/request')
          .set('Authorization', authHeader())
          .send({ amountPaise: 'a lot', method: 'upi' })
          .expect(400);
      });

      it('propagates a 400 from the service when the business-rule check fails (e.g. below minimum payout)', async () => {
        affiliatesService.requestPayout.mockRejectedValue(new BadRequestException('Minimum payout is ₹1,000.'));
        await request(app.getHttpServer())
          .post('/affiliates/payouts/request')
          .set('Authorization', authHeader())
          .send({ amountPaise: 100000, method: 'upi' })
          .expect(400);
      });

      it('propagates a 404 from the service when there is no affiliate account', async () => {
        affiliatesService.requestPayout.mockRejectedValue(new NotFoundException('No affiliate account found.'));
        await request(app.getHttpServer())
          .post('/affiliates/payouts/request')
          .set('Authorization', authHeader())
          .send({ amountPaise: 100000, method: 'upi' })
          .expect(404);
      });
    });
  });
});
