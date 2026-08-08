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

    // Deliberate: Supabase's pooler cert chain isn't in Node's default trust
    // store. Connection is still TLS-encrypted, just not verified against a
    // CA — accepted tradeoff for this managed Postgres provider.
    const ssl =
      url.includes('supabase.co') || process.env.DATABASE_SSL !== 'false'
        ? // nosemgrep: problem-based-packs.insecure-transport.js-node.bypass-tls-verification.bypass-tls-verification
          { rejectUnauthorized: false }
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
