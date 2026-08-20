import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { THROTTLE } from '../../config/throttle.config';
import { ApiResponse } from '../../common/api-response';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import { SubscribeNewsletterDto } from './dto/subscribe.dto';
import { NewsletterService } from './newsletter.service';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({
    default: {
      limit: THROTTLE.public.limit,
      ttl: THROTTLE.public.ttl,
    },
  })
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeNewsletterDto, @CurrentUser() user?: AuthUser) {
    const result = await this.newsletterService.subscribe(dto, user?.sub);
    // Deliberately uniform regardless of whether the address was already on
    // the list — the response shouldn't let anyone probe for subscribers.
    return ApiResponse.ok({ subscribed: true, already_subscribed: result.alreadySubscribed });
  }
}
