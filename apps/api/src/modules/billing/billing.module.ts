import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BillingController } from './billing.controller';
import { DodoService } from './dodo.service';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [UsersModule],
  controllers: [BillingController],
  providers: [DodoService, SubscriptionsService],
  exports: [DodoService, SubscriptionsService],
})
export class BillingModule {}
