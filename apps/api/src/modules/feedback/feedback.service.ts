import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackRepository } from './feedback.repository';

@Injectable()
export class FeedbackService {
  constructor(private readonly feedbackRepo: FeedbackRepository) {}

  create(dto: CreateFeedbackDto, userId?: string | null) {
    return this.feedbackRepo.create({
      user_id: userId ?? null,
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      category: dto.category,
      message: dto.message.trim(),
      page_url: dto.page_url?.trim() || null,
    });
  }
}
