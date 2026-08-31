import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RetentionController } from './retention.controller';
import { RetentionService } from './retention.service';

describe('RetentionController', () => {
  let controller: RetentionController;
  let service: jest.Mocked<RetentionService>;

  beforeEach(async () => {
    service = {
      runSweep: jest.fn().mockResolvedValue({
        dryRun: true,
        usersWarned: 1,
        videosWarned: 2,
        videosDeleted: 0,
        deleteFailures: 0,
      }),
    } as unknown as jest.Mocked<RetentionService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [RetentionController],
      providers: [{ provide: RetentionService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(RetentionController);
  });

  it('previews without side effects', async () => {
    const result = await controller.preview();

    expect(service.runSweep).toHaveBeenCalledWith({ dryRun: true });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ usersWarned: 1, videosWarned: 2 });
  });

  it('runs the real sweep', async () => {
    await controller.run();

    expect(service.runSweep).toHaveBeenCalledWith({ dryRun: false });
  });

  it('is guarded by both the JWT and admin guards', () => {
    const guards = Reflect.getMetadata('__guards__', RetentionController) ?? [];

    expect(guards).toEqual([JwtAuthGuard, AdminGuard]);
  });
});
