import { NewsletterService } from './newsletter.service';
import { NewsletterRepository } from './newsletter.repository';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let repo: jest.Mocked<NewsletterRepository>;

  beforeEach(() => {
    repo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      resubscribe: jest.fn(),
    } as unknown as jest.Mocked<NewsletterRepository>;

    service = new NewsletterService(repo);
  });

  describe('subscribe', () => {
    it('creates a new subscriber when the email is not on the list', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'n1' } as never);

      const result = await service.subscribe({ email: 'jane@example.com' });

      expect(result).toEqual({ alreadySubscribed: false });
      expect(repo.create).toHaveBeenCalledWith({
        email: 'jane@example.com',
        user_id: null,
        source: 'footer',
        consent_page_url: null,
      });
    });

    it('normalises the email to lowercase and trims it', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'n1' } as never);

      await service.subscribe({ email: '  Jane@Example.COM  ' });

      expect(repo.findByEmail).toHaveBeenCalledWith('jane@example.com');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'jane@example.com' }));
    });

    it('records the signed-in user id when there is one', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'n1' } as never);

      await service.subscribe({ email: 'jane@example.com' }, 'user-1');

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1' }));
    });

    it('stores the consent page url when provided', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'n1' } as never);

      await service.subscribe({ email: 'jane@example.com', page_url: 'https://autoclipr.com/blog' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ consent_page_url: 'https://autoclipr.com/blog' }),
      );
    });

    it('stores a null consent url when page_url is blank', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'n1' } as never);

      await service.subscribe({ email: 'jane@example.com', page_url: '   ' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ consent_page_url: null }));
    });

    it('uses a custom source when provided', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'n1' } as never);

      await service.subscribe({ email: 'jane@example.com', source: 'blog' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'blog' }));
    });

    it('falls back to the footer source when source is blank', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'n1' } as never);

      await service.subscribe({ email: 'jane@example.com', source: '  ' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'footer' }));
    });

    it('is idempotent for an address that is already subscribed', async () => {
      repo.findByEmail.mockResolvedValue({ id: 'n1', unsubscribed_at: null } as never);

      const result = await service.subscribe({ email: 'jane@example.com' });

      expect(result).toEqual({ alreadySubscribed: true });
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.resubscribe).not.toHaveBeenCalled();
    });

    it('reactivates an address that had previously unsubscribed', async () => {
      repo.findByEmail.mockResolvedValue({
        id: 'n1',
        unsubscribed_at: '2026-01-01T00:00:00Z',
      } as never);
      repo.resubscribe.mockResolvedValue({ id: 'n1' } as never);

      const result = await service.subscribe({ email: 'jane@example.com', source: 'blog' });

      expect(result).toEqual({ alreadySubscribed: false });
      expect(repo.resubscribe).toHaveBeenCalledWith('n1', 'blog');
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('propagates a repository failure', async () => {
      repo.findByEmail.mockRejectedValue(new Error('db down'));

      await expect(service.subscribe({ email: 'jane@example.com' })).rejects.toThrow('db down');
    });
  });
});
