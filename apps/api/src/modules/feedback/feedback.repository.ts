import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import type { FeedbackCategory } from './dto/create-feedback.dto';

export interface FeedbackRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  category: string;
  message: string;
  page_url: string | null;
  created_at: string;
}

@Injectable()
export class FeedbackRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async create(data: {
    user_id?: string | null;
    name: string;
    email: string;
    category: FeedbackCategory;
    message: string;
    page_url?: string | null;
  }): Promise<FeedbackRow> {
    const { data: row, error } = await this.supabase
      .getClient()
      .from('feedback')
      .insert({
        user_id: data.user_id ?? null,
        name: data.name,
        email: data.email,
        category: data.category,
        message: data.message,
        page_url: data.page_url ?? null,
      })
      .select('id, user_id, name, email, category, message, page_url, created_at')
      .single();

    if (error) throw new Error(error.message);
    if (!row) throw new Error('Failed to save feedback');
    return row as FeedbackRow;
  }
}
