import { JobsRepository } from './jobs.repository';
import {
  createQueryBuilderMock,
  createSupabaseClientMock,
  createSupabaseAdminServiceMock,
  type QueryBuilderMock,
} from '../../test-utils/supabase-query-builder.mock';

describe('JobsRepository', () => {
  let repo: JobsRepository;
  let builder: QueryBuilderMock;
  let fromMock: jest.Mock;

  function setup(result: Parameters<typeof createQueryBuilderMock>[0]) {
    builder = createQueryBuilderMock(result);
    const client = createSupabaseClientMock(() => builder);
    fromMock = client.from;
    const supabase = createSupabaseAdminServiceMock(client);
    repo = new JobsRepository(supabase as never);
  }

  describe('enqueue', () => {
    it('inserts a queued job row with defaults for optional fields', async () => {
      setup({
        data: { id: 'job1', scheduled_at: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
        error: null,
      });

      const result = await repo.enqueue({
        user_id: 'u1',
        job_type: 'generate_clips',
        payload: { foo: 'bar' },
      });

      expect(fromMock).toHaveBeenCalledWith('processing_jobs');
      expect(builder.insert).toHaveBeenCalledWith({
        user_id: 'u1',
        video_id: null,
        clip_id: null,
        job_type: 'generate_clips',
        status: 'queued',
        payload: { foo: 'bar' },
      });
      expect(builder.select).toHaveBeenCalledWith('id, scheduled_at, created_at');
      expect(result).toEqual({
        id: 'job1',
        scheduled_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      });
    });

    it('passes through video_id and clip_id when provided', async () => {
      setup({ data: { id: 'job1', scheduled_at: 'x', created_at: 'y' }, error: null });

      await repo.enqueue({
        user_id: 'u1',
        video_id: 'v1',
        clip_id: 'c1',
        job_type: 'export_clip',
        payload: {},
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ video_id: 'v1', clip_id: 'c1' }),
      );
    });

    it('throws when supabase returns an error', async () => {
      setup({ data: null, error: { message: 'insert failed' } });
      await expect(
        repo.enqueue({ user_id: 'u1', job_type: 'generate_clips', payload: {} }),
      ).rejects.toThrow('insert failed');
    });

    it('throws when no data is returned and there is no error', async () => {
      setup({ data: null, error: null });
      await expect(
        repo.enqueue({ user_id: 'u1', job_type: 'generate_clips', payload: {} }),
      ).rejects.toThrow('Failed to enqueue job');
    });
  });

  describe('findById', () => {
    it('returns the job row when found', async () => {
      setup({ data: { id: 'job1', status: 'queued' }, error: null });
      const result = await repo.findById('job1');
      expect(builder.eq).toHaveBeenCalledWith('id', 'job1');
      expect(result).toEqual({ id: 'job1', status: 'queued' });
    });

    it('returns null when not found', async () => {
      setup({ data: null, error: null });
      const result = await repo.findById('missing');
      expect(result).toBeNull();
    });

    it('throws on error', async () => {
      setup({ data: null, error: { message: 'query failed' } });
      await expect(repo.findById('job1')).rejects.toThrow('query failed');
    });
  });

  describe('findLatestByVideo', () => {
    it('returns the latest job for a video', async () => {
      setup({ data: { id: 'job2', job_type: 'analyze_video' }, error: null });
      const result = await repo.findLatestByVideo('v1');
      expect(builder.eq).toHaveBeenCalledWith('video_id', 'v1');
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(builder.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 'job2', job_type: 'analyze_video' });
    });

    it('returns null when no jobs exist for the video', async () => {
      setup({ data: null, error: null });
      const result = await repo.findLatestByVideo('v1');
      expect(result).toBeNull();
    });

    it('throws on error', async () => {
      setup({ data: null, error: { message: 'query failed' } });
      await expect(repo.findLatestByVideo('v1')).rejects.toThrow('query failed');
    });
  });
});
