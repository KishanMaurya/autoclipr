import { FeedbackRepository } from './feedback.repository';
import { createMockSupabaseClient, mockQueryBuilder, mockSupabaseAdminService } from '../../test-utils/supabase-mock';

describe('FeedbackRepository', () => {
  let client: ReturnType<typeof createMockSupabaseClient>;
  let repo: FeedbackRepository;

  beforeEach(() => {
    client = createMockSupabaseClient();
    repo = new FeedbackRepository(mockSupabaseAdminService(client) as any);
  });

  it('inserts feedback and returns the created row', async () => {
    const row = {
      id: 'f1',
      user_id: 'u1',
      name: 'Alice',
      email: 'alice@x.com',
      category: 'bug',
      message: 'It broke',
      page_url: 'https://app/x',
      created_at: '2026-01-01T00:00:00Z',
    };
    client.from.mockReturnValueOnce(mockQueryBuilder({ data: row, error: null }));

    const result = await repo.create({
      user_id: 'u1',
      name: 'Alice',
      email: 'alice@x.com',
      category: 'bug',
      message: 'It broke',
      page_url: 'https://app/x',
    });

    expect(result).toEqual(row);
    expect(client.from).toHaveBeenCalledWith('feedback');
  });

  it('defaults user_id and page_url to null when not provided', async () => {
    const builder = mockQueryBuilder({ data: { id: 'f2' }, error: null });
    client.from.mockReturnValueOnce(builder);

    await repo.create({ name: 'Bob', email: 'bob@x.com', category: 'general', message: 'Hello there' });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null, page_url: null }),
    );
  });

  it('throws when supabase returns an error', async () => {
    client.from.mockReturnValueOnce(mockQueryBuilder({ data: null, error: { message: 'insert failed' } }));
    await expect(
      repo.create({ name: 'A', email: 'a@x.com', category: 'general', message: 'msg here' }),
    ).rejects.toThrow('insert failed');
  });

  it('throws when supabase returns no row and no error', async () => {
    client.from.mockReturnValueOnce(mockQueryBuilder({ data: null, error: null }));
    await expect(
      repo.create({ name: 'A', email: 'a@x.com', category: 'general', message: 'msg here' }),
    ).rejects.toThrow('Failed to save feedback');
  });
});
