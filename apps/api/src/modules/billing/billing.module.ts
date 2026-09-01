import { Module, forwardRef } from '@nestjs/common';
import { InvoicePdfService } from '@autoclipr/emails';
import { UsersModule } from '../users/users.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { RetentionModule } from '../retention/retention.module';
import { CouponsModule } from '../coupons/coupons.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { BillingController } from './billing.controller';
import { DodoService } from './dodo.service';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [UsersModule, AffiliatesModule, RetentionModule, forwardRef(() => CouponsModule), forwardRef(() => CampaignsModule)],
  controllers: [BillingController],
  providers: [DodoService, SubscriptionsService, InvoicePdfService],
  exports: [DodoService, SubscriptionsService],
})
export class BillingModule {}
