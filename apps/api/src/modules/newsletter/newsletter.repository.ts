import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';

export interface NewsletterSubscriberRow {
  id: string;
  email: string;
  user_id: string | null;
  source: string;
  consent_page_url: string | null;
  unsubscribed_at: string | null;
  created_at: string;
}

const COLUMNS = 'id, email, user_id, source, consent_page_url, unsubscribed_at, created_at';

@Injectable()
export class NewsletterRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async findByEmail(email: string): Promise<NewsletterSubscriberRow | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('newsletter_subscribers')
      .select(COLUMNS)
      .eq('email', email)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as NewsletterSubscriberRow | null) ?? null;
  }

  async create(data: {
    email: string;
    user_id?: string | null;
    source: string;
    consent_page_url?: string | null;
  }): Promise<NewsletterSubscriberRow> {
    const { data: row, error } = await this.supabase
      .getClient()
      .from('newsletter_subscribers')
      .insert({
        email: data.email,
        user_id: data.user_id ?? null,
        source: data.source,
        consent_page_url: data.consent_page_url ?? null,
      })
      .select(COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    if (!row) throw new Error('Failed to save subscription');
    return row as NewsletterSubscriberRow;
  }

  /** Clears unsubscribed_at so a previously opted-out address is active again. */
  async resubscribe(id: string, source: string): Promise<NewsletterSubscriberRow> {
    const { data: row, error } = await this.supabase
      .getClient()
      .from('newsletter_subscribers')
      .update({
        unsubscribed_at: null,
        source,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    if (!row) throw new Error('Failed to update subscription');
    return row as NewsletterSubscriberRow;
  }
}
