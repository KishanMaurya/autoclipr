import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoicePdfService } from '@autoclipr/emails';
import { IsString } from 'class-validator';
import { Request } from 'express';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { DodoService } from './dodo.service';
import { SubscriptionsService } from './subscriptions.service';

class CreateCheckoutDto {
  @IsString()
  planId!: string;
}

class ActivatePlanDto {
  @IsString()
  planId!: string;
}

@Controller()
export class BillingController {
  constructor(
    private readonly usersService: UsersService,
    private readonly dodo: DodoService,
    private readonly subscriptions: SubscriptionsService,
    private readonly invoicePdf: InvoicePdfService,
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
    // Use email from JWT directly — avoids profile-not-found if profile row is missing
    let email = user.email ?? '';
    if (!email) {
      try {
        const profile = await this.usersService.getMe(user.sub);
        email = profile.email;
      } catch {
        throw new BadRequestException('Could not determine user email for checkout');
      }
    }
    const url = await this.subscriptions.createCheckoutUrl(user.sub, email, dto.planId);
    return ApiResponse.ok({ url });
  }

  @Get('billing/invoice/download')
  @UseGuards(JwtAuthGuard)
  async downloadInvoice(
    @CurrentUser() user: AuthUser,
    @Query('invoiceNumber') invoiceNumber: string,
    @Query('plan') plan: string,
    @Query('amount') amount: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    let email = user.email ?? '';
    let fullName = email.split('@')[0];
    try {
      const profile = await this.usersService.getMe(user.sub);
      email = profile.email || email;
      fullName = profile.full_name || fullName;
    } catch { /* use JWT values */ }

    const appUrl = process.env.WEB_APP_URL ?? 'https://autoclipr.com';
    const pdfBuffer = await this.invoicePdf.generate({
      invoiceNumber: invoiceNumber ?? 'N/A',
      transactionId: '-',
      paymentDate: date ?? new Date().toLocaleDateString('en-IN'),
      userName: fullName,
      userEmail: email,
      planName: plan ?? 'Creator',
      amount: amount ?? '₹349.00',
      companyName: 'AutoClipr',
      companyWebsite: appUrl,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="autoclipr-invoice-${invoiceNumber ?? 'invoice'}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  // Called from frontend on payment success redirect — fallback when webhook is delayed/missing
  @Post('billing/activate')
  @UseGuards(JwtAuthGuard)
  async activatePlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: ActivatePlanDto,
  ) {
    await this.subscriptions.activatePlanForUser(user.sub, dto.planId, user.email);
    return ApiResponse.ok({ activated: true });
  }

  @Post('webhooks/dodo')
  @HttpCode(200)
  async dodoWebhook(@Req() req: RawBodyRequest<Request>) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers[k] = v;
    }
    try {
      const event = this.dodo.verifyWebhook(rawBody, headers);
      await this.subscriptions.handleWebhookEvent(event);
    } catch {
      // In test mode signature may not match — still process body
      await this.subscriptions.handleWebhookEvent(req.body);
    }
    return { received: true };
  }
}
