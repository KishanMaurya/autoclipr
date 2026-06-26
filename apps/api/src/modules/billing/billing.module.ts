import { Module } from '@nestjs/common';
import { InvoicePdfService } from '@autoclipr/emails';
import { UsersModule } from '../users/users.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { BillingController } from './billing.controller';
import { DodoService } from './dodo.service';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [UsersModule, AffiliatesModule],
  controllers: [BillingController],
  providers: [DodoService, SubscriptionsService, InvoicePdfService],
  exports: [DodoService, SubscriptionsService],
})
export class BillingModule {}
