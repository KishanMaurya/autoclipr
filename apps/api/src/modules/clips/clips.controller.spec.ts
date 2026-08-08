import { ClipsController } from './clips.controller';
import { ClipsService } from './clips.service';

describe('ClipsController', () => {
  let controller: ClipsController;
  let service: jest.Mocked<ClipsService>;
  const user = { sub: 'u1', email: 'u1@test.dev' };

  beforeEach(() => {
    service = {
      generate: jest.fn(),
      list: jest.fn(),
      bulkDelete: jest.fn(),
      bulkDownloadUrls: jest.fn(),
      publish: jest.fn(),
      getPublications: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      export: jest.fn(),
    } as unknown as jest.Mocked<ClipsService>;

    controller = new ClipsController(service);
  });

  it('generate delegates to the service', async () => {
    service.generate.mockResolvedValue({ id: 'job1' } as never);
    const dto = { video_id: 'v1' };

    const result = await controller.generate(user, dto as never);

    expect(service.generate).toHaveBeenCalledWith('u1', dto);
    expect(result.data).toEqual({ id: 'job1' });
  });

  describe('list', () => {
    it('computes pagination meta', async () => {
      service.list.mockResolvedValue({ items: [{ id: 'c1' }], total: 20 } as never);

      const result = await controller.list(user, '2', '10');

      expect(service.list).toHaveBeenCalledWith('u1', 2, 10);
      expect(result.meta).toEqual({ page: 2, limit: 10, total: 20, has_more: false });
    });

    it('defaults page/limit when query params are absent', async () => {
      service.list.mockResolvedValue({ items: [], total: 0 } as never);

      await controller.list(user, undefined, undefined);

      expect(service.list).toHaveBeenCalledWith('u1', 1, 20);
    });

    it('sets has_more = true when more pages remain', async () => {
      service.list.mockResolvedValue({ items: [], total: 100 } as never);

      const result = await controller.list(user, '1', '10');

      expect(result.meta?.has_more).toBe(true);
    });
  });

  it('bulkDelete delegates using dto.clip_ids', async () => {
    service.bulkDelete.mockResolvedValue({ deleted_ids: ['c1', 'c2'] });

    const result = await controller.bulkDelete(user, { clip_ids: ['c1', 'c2'] });

    expect(service.bulkDelete).toHaveBeenCalledWith('u1', ['c1', 'c2']);
    expect(result.data).toEqual({ deleted_ids: ['c1', 'c2'] });
  });

  it('bulkDownload wraps the service result under an "items" key', async () => {
    service.bulkDownloadUrls.mockResolvedValue([{ id: 'c1' } as never]);

    const result = await controller.bulkDownload(user, { clip_ids: ['c1'] });

    expect(service.bulkDownloadUrls).toHaveBeenCalledWith('u1', ['c1']);
    expect(result.data).toEqual({ items: [{ id: 'c1' }] });
  });

  it('publish delegates to the service with id, dto', async () => {
    service.publish.mockResolvedValue({ job: {}, publications: [] } as never);
    const dto = { platforms: ['youtube' as const] };

    const result = await controller.publish(user, 'c1', dto);

    expect(service.publish).toHaveBeenCalledWith('u1', 'c1', dto);
    expect(result.data).toEqual({ job: {}, publications: [] });
  });

  it('publications delegates to getPublications', async () => {
    service.getPublications.mockResolvedValue([{ id: 'p1' } as never]);

    const result = await controller.publications(user, 'c1');

    expect(service.getPublications).toHaveBeenCalledWith('u1', 'c1');
    expect(result.data).toEqual([{ id: 'p1' }]);
  });

  it('get delegates to service.get', async () => {
    service.get.mockResolvedValue({ id: 'c1' } as never);

    const result = await controller.get(user, 'c1');

    expect(service.get).toHaveBeenCalledWith('u1', 'c1');
    expect(result.data).toEqual({ id: 'c1' });
  });

  it('delete delegates to service.delete', async () => {
    service.delete.mockResolvedValue({ deleted: true, id: 'c1' });

    const result = await controller.delete(user, 'c1');

    expect(service.delete).toHaveBeenCalledWith('u1', 'c1');
    expect(result.data).toEqual({ deleted: true, id: 'c1' });
  });

  it('export delegates to service.export', async () => {
    service.export.mockResolvedValue({ id: 'job1' } as never);

    const result = await controller.export(user, 'c1');

    expect(service.export).toHaveBeenCalledWith('u1', 'c1');
    expect(result.data).toEqual({ id: 'job1' });
  });
});
