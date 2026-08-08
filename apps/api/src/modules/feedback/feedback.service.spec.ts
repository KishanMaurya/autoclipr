import { FeedbackService } from './feedback.service';
import { FeedbackRepository } from './feedback.repository';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    create: jest.fn().mockResolvedValue({ id: 'f1', created_at: '2026-01-01T00:00:00Z' }),
    ...overrides,
  } as unknown as FeedbackRepository;
}

function makeEmail(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    sendContactConfirmation: jest.fn().mockResolvedValue(undefined),
    sendFeedbackConfirmation: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

function baseDto(overrides: Partial<CreateFeedbackDto> = {}): CreateFeedbackDto {
  return {
    name: '  Alice  ',
    email: '  Alice@Example.com  ',
    category: 'bug',
    message: '  Something broke here  ',
    ...overrides,
  } as CreateFeedbackDto;
}

describe('FeedbackService', () => {
  it('trims and lowercases fields before persisting', async () => {
    const repo = makeRepo();
    const service = new FeedbackService(repo, makeEmail());
    await service.create(baseDto(), 'u1');

    expect(repo.create).toHaveBeenCalledWith({
      user_id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      category: 'bug',
      message: 'Something broke here',
      page_url: null,
    });
  });

  it('passes user_id as null when no user is present', async () => {
    const repo = makeRepo();
    const service = new FeedbackService(repo, makeEmail());
    await service.create(baseDto(), undefined);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: null }));
  });

  it('trims page_url and passes null when it is only whitespace', async () => {
    const repo = makeRepo();
    const service = new FeedbackService(repo, makeEmail());
    await service.create(baseDto({ page_url: '   ' }), 'u1');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ page_url: null }));
  });

  it('sends the contact confirmation email when page_url contains /contact', async () => {
    const email = makeEmail();
    const service = new FeedbackService(makeRepo(), email);
    await service.create(baseDto({ page_url: 'https://app.example.com/contact' }), 'u1');

    expect(email.sendContactConfirmation).toHaveBeenCalledWith('alice@example.com', {
      userName: 'Alice',
      category: 'Bug report',
      message: 'Something broke here',
    });
    expect(email.sendFeedbackConfirmation).not.toHaveBeenCalled();
  });

  it('sends the feedback confirmation email when page_url does not contain /contact', async () => {
    const email = makeEmail();
    const service = new FeedbackService(makeRepo(), email);
    await service.create(baseDto({ page_url: 'https://app.example.com/dashboard' }), 'u1');

    expect(email.sendFeedbackConfirmation).toHaveBeenCalledWith('alice@example.com', {
      userName: 'Alice',
      category: 'Bug report',
      message: 'Something broke here',
    });
    expect(email.sendContactConfirmation).not.toHaveBeenCalled();
  });

  it('sends the feedback confirmation email when page_url is absent', async () => {
    const email = makeEmail();
    const service = new FeedbackService(makeRepo(), email);
    await service.create(baseDto(), 'u1');
    expect(email.sendFeedbackConfirmation).toHaveBeenCalled();
    expect(email.sendContactConfirmation).not.toHaveBeenCalled();
  });

  it.each([
    ['general', 'General feedback'],
    ['bug', 'Bug report'],
    ['feature', 'Feature request'],
    ['billing', 'Billing & account'],
    ['other', 'Other'],
  ])('maps category %s to label "%s"', async (category, label) => {
    const email = makeEmail();
    const service = new FeedbackService(makeRepo(), email);
    await service.create(baseDto({ category: category as CreateFeedbackDto['category'] }), 'u1');
    expect(email.sendFeedbackConfirmation).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ category: label }),
    );
  });

  it('falls back to the raw category string when it has no label mapping', async () => {
    const email = makeEmail();
    const service = new FeedbackService(makeRepo(), email);
    await service.create(baseDto({ category: 'unmapped-category' as any }), 'u1');
    expect(email.sendFeedbackConfirmation).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ category: 'unmapped-category' }),
    );
  });

  it('returns the created row from the repository', async () => {
    const row = { id: 'f9', created_at: '2026-02-02T00:00:00Z' };
    const repo = makeRepo({ create: jest.fn().mockResolvedValue(row) });
    const service = new FeedbackService(repo, makeEmail());
    await expect(service.create(baseDto(), 'u1')).resolves.toEqual(row);
  });

  it('does not await the email dispatch before resolving (fire-and-forget)', async () => {
    let emailResolved = false;
    const email = makeEmail({
      sendFeedbackConfirmation: jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => { emailResolved = true; resolve(undefined); }, 50)),
      ),
    });
    const repo = makeRepo();
    const service = new FeedbackService(repo, email);
    await service.create(baseDto(), 'u1');
    // create() resolved without waiting for the (still-pending) email send.
    expect(emailResolved).toBe(false);
  });
});
