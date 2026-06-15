import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;

  onModuleInit() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      this.logger.error(
        'DATABASE_URL is required. Set it on the workers service in Railway.',
      );
      return;
    }

    const ssl =
      url.includes('supabase.co') || process.env.DATABASE_SSL !== 'false'
        ? { rejectUnauthorized: false }
        : undefined;

    this.pool = new Pool({ connectionString: url, ssl });
  }

  get client(): Pool {
    if (!this.pool) {
      throw new Error('DATABASE_URL is not configured');
    }
    return this.pool;
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
