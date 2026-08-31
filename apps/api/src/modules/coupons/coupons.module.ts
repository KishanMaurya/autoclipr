import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { CouponsRepository } from './coupons.repository';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';

@Module({
  // forwardRef because billing needs coupons to apply a discount at checkout,
  // and coupons need billing's DodoService to mirror one.
  imports: [forwardRef(() => BillingModule)],
  providers: [CouponsRepository, CouponsService],
  controllers: [CouponsController],
  exports: [CouponsService],
})
export class CouponsModule {}
