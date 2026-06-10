import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const MIN_REDIS_MAJOR = 6;
const MIN_REDIS_MINOR = 2;

@Injectable()
export class RedisHealthService implements OnModuleInit {
  private readonly logger = new Logger(RedisHealthService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('redisUrl') ?? process.env.REDIS_URL ?? 'redis://localhost:6379';
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    try {
      await client.connect();
      const info = await client.info('server');
      const match = info.match(/redis_version:(\d+)\.(\d+)\.(\d+)/);
      const major = match ? parseInt(match[1], 10) : 0;
      const minor = match ? parseInt(match[2], 10) : 0;
      const patch = match ? match[3] : '?';
      const version = `${major}.${minor}.${patch}`;

      if (major < MIN_REDIS_MAJOR || (major === MIN_REDIS_MAJOR && minor < MIN_REDIS_MINOR)) {
        this.logger.error(
          `Redis ${version} is too old — BullMQ requires >= ${MIN_REDIS_MAJOR}.${MIN_REDIS_MINOR}. ` +
            'Run: powershell -ExecutionPolicy Bypass -File scripts/start-redis.ps1',
        );
      } else {
        this.logger.log(`Redis ${version} OK (${url})`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis unavailable at ${url}: ${message}`);
    } finally {
      client.disconnect();
    }
  }
}
