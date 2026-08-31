import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

describe('CouponsController', () => {
  let controller: CouponsController;
  let service: jest.Mocked<CouponsService>;
  const user = { sub: 'u1', email: 'jane@example.com' };

  beforeEach(async () => {
    service = {
      validate: jest.fn().mockResolvedValue({ id: 'c1', code: 'CREATOR20', discountPaise: 8376 }),
      list: jest.fn().mockResolvedValue([]),
      getWithStats: jest.fn().mockResolvedValue({ coupon: { id: 'c1' }, redemptionCount: 3 }),
      create: jest.fn().mockResolvedValue({ id: 'c1' }),
      setStatus: jest.fn().mockResolvedValue({ id: 'c1', status: 'paused' }),
      update: jest.fn().mockResolvedValue({ id: 'c1', value: 30 }),
      delete: jest.fn().mockResolvedValue({ deleted: true, id: 'c1' }),
    } as unknown as jest.Mocked<CouponsService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [{ provide: CouponsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(CouponsController);
  });

  describe('validate', () => {
    it('validates against the calling user, not a user id from the body', async () => {
      const result = await controller.validate(user as never, {
        code: 'CREATOR20',
        planId: 'creator',
        billingPeriod: 'monthly',
      });

      // The user id comes from the JWT — accepting one from the request would
      // let anyone check or burn coupons on another account.
      expect(service.validate).toHaveBeenCalledWith('CREATOR20', 'creator', 'monthly', 'u1');
      expect(result.success).toBe(true);
    });

    it('defaults the billing period to yearly', async () => {
      await controller.validate(user as never, { code: 'X', planId: 'creator' });

      expect(service.validate).toHaveBeenCalledWith('X', 'creator', 'yearly', 'u1');
    });
  });

  it('lists coupons', async () => {
    const result = await controller.list();

    expect(service.list).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('returns detail with redemption stats', async () => {
    const result = await controller.detail('c1');

    expect(service.getWithStats).toHaveBeenCalledWith('c1');
    expect(result.data).toMatchObject({ redemptionCount: 3 });
  });

  it('creates a coupon attributed to the calling admin', async () => {
    await controller.create(user as never, {
      code: 'SUMMER20',
      type: 'percentage',
      value: 20,
    });

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SUMMER20' }),
      'u1',
    );
  });

  it('edits a coupon', async () => {
    await controller.update('c1', { value: 30 });

    expect(service.update).toHaveBeenCalledWith('c1', { value: 30 });
  });

  it('deletes a coupon', async () => {
    const result = await controller.remove('c1');

    expect(service.delete).toHaveBeenCalledWith('c1');
    expect(result.data).toEqual({ deleted: true, id: 'c1' });
  });

  it('changes a coupon status', async () => {
    await controller.setStatus('c1', { status: 'paused' });

    expect(service.setStatus).toHaveBeenCalledWith('c1', 'paused');
  });

  it('requires authentication at the controller level', () => {
    const guards = Reflect.getMetadata('__guards__', CouponsController) ?? [];

    expect(guards).toEqual([JwtAuthGuard]);
  });

  it.each([
    ['list', CouponsController.prototype.list],
    ['detail', CouponsController.prototype.detail],
    ['create', CouponsController.prototype.create],
    ['setStatus', CouponsController.prototype.setStatus],
    ['update', CouponsController.prototype.update],
    ['remove', CouponsController.prototype.remove],
  ])('guards the admin route %s with AdminGuard', (_name, handler) => {
    const guards = Reflect.getMetadata('__guards__', handler) ?? [];

    expect(guards).toContain(AdminGuard);
  });

  it('does not put AdminGuard on validate — ordinary users apply coupons', () => {
    const guards = Reflect.getMetadata('__guards__', CouponsController.prototype.validate) ?? [];

    expect(guards).not.toContain(AdminGuard);
  });
});
