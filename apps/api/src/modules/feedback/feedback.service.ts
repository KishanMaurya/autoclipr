import { Injectable } from '@nestjs/common';
import { EmailService } from '@autoclipr/emails';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackRepository } from './feedback.repository';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General feedback',
  bug: 'Bug report',
  feature: 'Feature request',
  billing: 'Billing & account',
  other: 'Other',
};

@Injectable()
export class FeedbackService {
  constructor(
    private readonly feedbackRepo: FeedbackRepository,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateFeedbackDto, userId?: string | null) {
    const row = await this.feedbackRepo.create({
      user_id: userId ?? null,
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      category: dto.category,
      message: dto.message.trim(),
      page_url: dto.page_url?.trim() || null,
    });

    const categoryLabel = CATEGORY_LABELS[dto.category] ?? dto.category;
    const isContact = dto.page_url?.includes('/contact');

    if (isContact) {
      void this.email.sendContactConfirmation(dto.email.trim().toLowerCase(), {
        userName: dto.name.trim(),
        category: categoryLabel,
        message: dto.message.trim(),
      });
    } else {
      void this.email.sendFeedbackConfirmation(dto.email.trim().toLowerCase(), {
        userName: dto.name.trim(),
        category: categoryLabel,
        message: dto.message.trim(),
      });
    }

    return row;
  }
}
