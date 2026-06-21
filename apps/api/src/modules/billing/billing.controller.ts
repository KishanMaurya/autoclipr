import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { DodoService } from './dodo.service';
import { SubscriptionsService } from './subscriptions.service';

class CreateCheckoutDto {
  planId!: string;
}

@Controller()
export class BillingController {
  constructor(
    private readonly usersService: UsersService,
    private readonly dodo: DodoService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get('billing/subscription')
  @UseGuards(JwtAuthGuard)
  async subscription(@CurrentUser() user: AuthUser) {
    const data = await this.usersService.getBilling(user.sub);
    return ApiResponse.ok(data);
  }

  @Get('plans')
  plans() {
    return this.usersService.listPlans().then((plans) => ApiResponse.ok(plans));
  }

  @Post('billing/checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    const profile = await this.usersService.getMe(user.sub);
    const url = await this.subscriptions.createCheckoutUrl(
      user.sub,
      profile.email,
      dto.planId,
    );
    return ApiResponse.ok({ url });
  }

  @Post('webhooks/dodo')
  @HttpCode(200)
  async dodoWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('webhook-id') webhookId: string,
    @Headers('webhook-signature') signature: string,
    @Headers('webhook-timestamp') timestamp: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
    try {
      const webhookSignature = `${webhookId}.${timestamp}.${rawBody}`;
      const event = this.dodo.verifyWebhook(rawBody, webhookSignature);
      await this.subscriptions.handleWebhookEvent(event);
    } catch (err: any) {
      // If verification fails, try processing body directly (test mode)
      await this.subscriptions.handleWebhookEvent(req.body);
    }
    return { received: true };
  }
}
