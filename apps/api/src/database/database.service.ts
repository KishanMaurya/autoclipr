import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';
import { parse } from 'pg-connection-string';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('databaseUrl');
    if (!url) {
      this.logger.warn('DATABASE_URL not set — Postgres queries disabled');
      return;
    }

    const parsed = parse(url);
    if (parsed.host === 'base') {
      this.logger.error(
        'DATABASE_URL is malformed (host parsed as "base"). Fix .env: use a single DATABASE_URL= line and URL-encode @ # in passwords.',
      );
      return;
    }

    const ssl =
      url.includes('supabase.co') || process.env.DATABASE_SSL !== 'false'
        ? { rejectUnauthorized: false }
        : undefined;

    this.pool = new Pool({ connectionString: url, ssl });

    this.pool
      .query('SELECT 1')
      .then(() => {
        this.logger.log(`Postgres connected (${parsed.host})`);
      })
      .catch((err: Error) => {
        this.logger.warn(
          `Postgres unavailable (${parsed.host}): ${err.message}. Channel APIs use Supabase REST instead.`,
        );
      });
  }

  get connected(): boolean {
    return this.pool !== null;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }
    const result = await this.pool.query<T>(text, params);
    return result.rows;
  }

  async queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
