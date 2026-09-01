import { Module, forwardRef } from '@nestjs/common';
import { EmailModule } from '@autoclipr/emails';
import { CouponsModule } from '../coupons/coupons.module';
import { CampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';
import {
  AdminCampaignsController,
  CampaignClickController,
  EmailWebhookController,
} from './campaigns.controller';

@Module({
  // forwardRef: billing calls back into campaigns to attribute a redemption,
  // and campaigns reaches coupons which reaches billing.
  imports: [EmailModule, forwardRef(() => CouponsModule)],
  providers: [CampaignsRepository, CampaignsService],
  controllers: [AdminCampaignsController, CampaignClickController, EmailWebhookController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
