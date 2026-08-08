import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

function makeService(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    create: jest.fn().mockResolvedValue({ id: 'f1', created_at: '2026-01-01T00:00:00Z' }),
    ...overrides,
  } as unknown as FeedbackService;
}

function dto(overrides: Partial<CreateFeedbackDto> = {}): CreateFeedbackDto {
  return { name: 'Alice', email: 'a@b.com', category: 'bug', message: 'Something is broken' , ...overrides } as CreateFeedbackDto;
}

describe('FeedbackController', () => {
  it('creates feedback for an authenticated user and returns id/created_at', async () => {
    const service = makeService();
    const controller = new FeedbackController(service);
    const user: AuthUser = { sub: 'u1', email: 'u1@x.com' };

    const result = await controller.create(dto(), user);

    expect(service.create).toHaveBeenCalledWith(dto(), 'u1');
    expect(result).toEqual({
      success: true,
      data: { id: 'f1', created_at: '2026-01-01T00:00:00Z' },
      meta: undefined,
    });
  });

  it('creates feedback anonymously when no user is present', async () => {
    const service = makeService();
    const controller = new FeedbackController(service);

    await controller.create(dto(), undefined);

    expect(service.create).toHaveBeenCalledWith(dto(), undefined);
  });
});
