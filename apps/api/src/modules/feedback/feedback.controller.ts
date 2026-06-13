import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE } from '../../config/throttle.config';
import { ApiResponse } from '../../common/api-response';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({
    default: {
      limit: THROTTLE.public.limit,
      ttl: THROTTLE.public.ttl,
    },
  })
  @Post()
  async create(@Body() dto: CreateFeedbackDto, @CurrentUser() user?: AuthUser) {
    const row = await this.feedbackService.create(dto, user?.sub);
    return ApiResponse.ok({ id: row.id, created_at: row.created_at });
  }
}
