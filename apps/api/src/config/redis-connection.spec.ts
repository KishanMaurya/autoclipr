import { bullMqConnectionOptions } from './redis-connection';

describe('bullMqConnectionOptions', () => {
  const originalRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  it('falls back to localhost when REDIS_URL is not set', () => {
    delete process.env.REDIS_URL;

    const options = bullMqConnectionOptions();

    expect(options.url).toBe('redis://localhost:6379');
  });

  it('uses REDIS_URL from the environment when set', () => {
    process.env.REDIS_URL = 'redis://user:pass@redis.internal:6380';

    const options = bullMqConnectionOptions();

    expect(options.url).toBe('redis://user:pass@redis.internal:6380');
  });

  it('returns the fixed BullMQ/ioredis tuning options', () => {
    const options = bullMqConnectionOptions();

    expect(options.connectTimeout).toBe(10_000);
    expect(options.maxRetriesPerRequest).toBeNull();
    expect(options.enableReadyCheck).toBe(false);
    expect(options.lazyConnect).toBe(true);
  });
});
