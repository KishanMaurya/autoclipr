import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

function makeService(overrides: Partial<Record<keyof AdminService, jest.Mock>> = {}) {
  return {
    getExecutiveDashboard: jest.fn().mockResolvedValue({ ok: true }),
    getAuditLogs: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
    getAnalytics: jest.fn().mockResolvedValue({ days: 30 }),
    getTopCreators: jest.fn().mockResolvedValue([]),
    getClipsByUser: jest.fn().mockResolvedValue([]),
    getErrors: jest.fn().mockResolvedValue({ entries: [], summary: {} }),
    ...overrides,
  } as unknown as AdminService;
}

describe('AdminController', () => {
  describe('stats', () => {
    it('returns the executive dashboard wrapped in ApiResponse', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      const result = await controller.stats();
      expect(service.getExecutiveDashboard).toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: { ok: true }, meta: undefined });
    });
  });

  describe('auditLogs', () => {
    it('parses limit/days query params', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.auditLogs('20', '5');
      expect(service.getAuditLogs).toHaveBeenCalledWith(20, 5);
    });

    it('defaults limit/days when query params are absent', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.auditLogs(undefined, undefined);
      expect(service.getAuditLogs).toHaveBeenCalledWith(100, 30);
    });
  });

  describe('analytics', () => {
    it('parses the days query param', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.analytics('14');
      expect(service.getAnalytics).toHaveBeenCalledWith(14);
    });

    it('defaults days to 30', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.analytics(undefined);
      expect(service.getAnalytics).toHaveBeenCalledWith(30);
    });
  });

  describe('topCreators', () => {
    it('parses the limit query param', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.topCreators('5');
      expect(service.getTopCreators).toHaveBeenCalledWith(5);
    });

    it('defaults limit to 50', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.topCreators(undefined);
      expect(service.getTopCreators).toHaveBeenCalledWith(50);
    });
  });

  describe('clipsByUser', () => {
    it('parses the limit query param', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.clipsByUser('7');
      expect(service.getClipsByUser).toHaveBeenCalledWith(7);
    });

    it('defaults limit to 50', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.clipsByUser(undefined);
      expect(service.getClipsByUser).toHaveBeenCalledWith(50);
    });
  });

  describe('errors', () => {
    it('parses the limit query param', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.errors('11');
      expect(service.getErrors).toHaveBeenCalledWith(11);
    });

    it('defaults limit to 50', async () => {
      const service = makeService();
      const controller = new AdminController(service);
      await controller.errors(undefined);
      expect(service.getErrors).toHaveBeenCalledWith(50);
    });
  });
});
