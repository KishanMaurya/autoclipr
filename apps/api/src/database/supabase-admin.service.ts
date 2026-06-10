import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseAdminService.name);
  private client: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('supabaseUrl');
    const key = this.config.get<string>('supabaseServiceKey');
    if (!url || !key) {
      this.logger.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      return;
    }

    if (this.looksLikeAnonKey(key)) {
      this.logger.error(
        'SUPABASE_SERVICE_ROLE_KEY looks like the anon key. Use the service_role secret from Supabase → Settings → API.',
      );
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env',
      );
    }
    return this.client;
  }

  private looksLikeAnonKey(jwt: string): boolean {
    try {
      const payload = JSON.parse(
        Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'),
      ) as { role?: string };
      return payload.role === 'anon';
    } catch {
      return false;
    }
  }
}
