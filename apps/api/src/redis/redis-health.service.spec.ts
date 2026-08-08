import { RedisHealthService } from './redis-health.service';

const mockConnect = jest.fn();
const mockPing = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    ping: mockPing,
    disconnect: mockDisconnect,
  })),
}));

describe('RedisHealthService', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockPing.mockResolvedValue('PONG');
    logSpy = jest.spyOn(require('@nestjs/common').Logger.prototype, 'log').mockImplementation();
    errorSpy = jest
      .spyOn(require('@nestjs/common').Logger.prototype, 'error')
      .mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  it('logs success and disconnects when connect + ping both succeed', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const service = new RedisHealthService();

    await service.onModuleInit();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockPing).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Redis OK'));
    expect(mockDisconnect).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('masks credentials in the success log message', async () => {
    process.env.REDIS_URL = 'redis://user:secretpass@redis.internal:6379';
    const service = new RedisHealthService();

    await service.onModuleInit();

    const message = logSpy.mock.calls[0][0] as string;
    expect(message).not.toContain('secretpass');
    expect(message).toContain(':***@');
  });

  it('logs an error and still disconnects when connect() rejects with an Error', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    mockConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const service = new RedisHealthService();

    await service.onModuleInit();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('ECONNREFUSED'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Redis unavailable'));
    expect(mockDisconnect).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs an error and still disconnects when ping() rejects', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    mockPing.mockRejectedValueOnce(new Error('timeout'));
    const service = new RedisHealthService();

    await service.onModuleInit();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('timeout'));
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('stringifies a non-Error rejection reason', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    mockConnect.mockRejectedValueOnce('plain string failure');
    const service = new RedisHealthService();

    await service.onModuleInit();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('plain string failure'));
  });

  it('masks credentials in the error log message', async () => {
    process.env.REDIS_URL = 'redis://user:secretpass@redis.internal:6379';
    mockConnect.mockRejectedValueOnce(new Error('nope'));
    const service = new RedisHealthService();

    await service.onModuleInit();

    const message = errorSpy.mock.calls[0][0] as string;
    expect(message).not.toContain('secretpass');
    expect(message).toContain(':***@');
  });
});
