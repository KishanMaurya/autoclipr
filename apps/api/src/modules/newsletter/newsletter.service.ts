import { Injectable } from '@nestjs/common';
import { NewsletterRepository } from './newsletter.repository';
import { SubscribeNewsletterDto } from './dto/subscribe.dto';

export type SubscribeResult = {
  /** True when this address was already on the list and still subscribed. */
  alreadySubscribed: boolean;
};

@Injectable()
export class NewsletterService {
  constructor(private readonly repo: NewsletterRepository) {}

  async subscribe(dto: SubscribeNewsletterDto, userId?: string | null): Promise<SubscribeResult> {
    const email = dto.email.trim().toLowerCase();
    const source = dto.source?.trim() || 'footer';

    const existing = await this.repo.findByEmail(email);

    if (existing) {
      // Already active — treat as success so the response never reveals
      // whether an address is on the list.
      if (!existing.unsubscribed_at) {
        return { alreadySubscribed: true };
      }
      // Previously opted out and now signing up again: reactivate.
      await this.repo.resubscribe(existing.id, source);
      return { alreadySubscribed: false };
    }

    await this.repo.create({
      email,
      user_id: userId ?? null,
      source,
      consent_page_url: dto.page_url?.trim() || null,
    });

    return { alreadySubscribed: false };
  }
}
