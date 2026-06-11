import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { bullMqConnectionOptions } from '../config/redis-connection';

@Injectable()
export class RedisHealthService implements OnModuleInit {
  private readonly logger = new Logger(RedisHealthService.name);

  async onModuleInit() {
    const opts = bullMqConnectionOptions();
    const client = new Redis(opts.url, {
      maxRetriesPerRequest: 1,
      connectTimeout: opts.connectTimeout,
      lazyConnect: true,
    });

    try {
      await client.connect();
      await client.ping();
      this.logger.log(`Redis OK (${opts.url.replace(/:[^:@]+@/, ':***@')})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Redis unavailable at ${opts.url.replace(/:[^:@]+@/, ':***@')}: ${message}. ` +
          'Set REDIS_URL=${{Redis.REDIS_URL}} on the API service in Railway.',
      );
    } finally {
      client.disconnect();
    }
  }
}
