import { Module } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeedbackController } from './feedback.controller';
import { FeedbackRepository } from './feedback.repository';
import { FeedbackService } from './feedback.service';

@Module({
  providers: [FeedbackRepository, FeedbackService, JwtAuthGuard, OptionalJwtAuthGuard],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
