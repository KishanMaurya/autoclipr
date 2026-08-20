import { Test } from '@nestjs/testing';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { NewsletterRepository } from './newsletter.repository';
import { createQueryBuilderMock, createSupabaseAdminServiceMock } from '../../test-utils/supabase-mock';

describe('NewsletterRepository', () => {
  let repo: NewsletterRepository;
  let supabaseMock: ReturnType<typeof createSupabaseAdminServiceMock>;

  beforeEach(async () => {
    supabaseMock = createSupabaseAdminServiceMock();

    const moduleRef = await Test.createTestingModule({
      providers: [NewsletterRepository, { provide: SupabaseAdminService, useValue: supabaseMock }],
    }).compile();

    repo = moduleRef.get(NewsletterRepository);
  });

  describe('findByEmail', () => {
    it('returns the subscriber row when one exists', async () => {
      const row = { id: 'n1', email: 'jane@example.com' };
      const builder = createQueryBuilderMock({ data: row, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.findByEmail('jane@example.com');

      expect(supabaseMock.__client.from).toHaveBeenCalledWith('newsletter_subscribers');
      expect(builder.eq).toHaveBeenCalledWith('email', 'jane@example.com');
      expect(result).toEqual(row);
    });

    it('returns null when no row matches', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.findByEmail('ghost@example.com')).resolves.toBeNull();
    });

    it('throws when Supabase returns an error', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'read failed' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.findByEmail('jane@example.com')).rejects.toThrow('read failed');
    });
  });

  describe('create', () => {
    it('inserts the subscriber and returns the row', async () => {
      const row = { id: 'n1', email: 'jane@example.com' };
      const builder = createQueryBuilderMock({ data: row, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.create({ email: 'jane@example.com', source: 'footer' });

      expect(builder.insert).toHaveBeenCalledWith({
        email: 'jane@example.com',
        user_id: null,
        source: 'footer',
        consent_page_url: null,
      });
      expect(result).toEqual(row);
    });

    it('passes through user_id and consent url when given', async () => {
      const builder = createQueryBuilderMock({ data: { id: 'n1' }, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.create({
        email: 'jane@example.com',
        source: 'blog',
        user_id: 'user-1',
        consent_page_url: 'https://autoclipr.com/blog',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', consent_page_url: 'https://autoclipr.com/blog' }),
      );
    });

    it('throws when the insert errors', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'insert failed' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.create({ email: 'jane@example.com', source: 'footer' })).rejects.toThrow(
        'insert failed',
      );
    });

    it('throws when no row comes back', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.create({ email: 'jane@example.com', source: 'footer' })).rejects.toThrow(
        'Failed to save subscription',
      );
    });
  });

  describe('resubscribe', () => {
    it('clears unsubscribed_at and updates the source', async () => {
      const builder = createQueryBuilderMock({ data: { id: 'n1' }, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.resubscribe('n1', 'blog');

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ unsubscribed_at: null, source: 'blog' }),
      );
      expect(builder.eq).toHaveBeenCalledWith('id', 'n1');
      expect(result).toEqual({ id: 'n1' });
    });

    it('throws when the update errors', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'update failed' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.resubscribe('n1', 'footer')).rejects.toThrow('update failed');
    });

    it('throws when no row comes back', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.resubscribe('n1', 'footer')).rejects.toThrow('Failed to update subscription');
    });
  });
});
