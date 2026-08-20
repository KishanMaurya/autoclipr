import { Module } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NewsletterController } from './newsletter.controller';
import { NewsletterRepository } from './newsletter.repository';
import { NewsletterService } from './newsletter.service';

@Module({
  providers: [NewsletterRepository, NewsletterService, JwtAuthGuard, OptionalJwtAuthGuard],
  controllers: [NewsletterController],
})
export class NewsletterModule {}
