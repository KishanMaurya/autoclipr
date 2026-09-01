import { Module } from '@nestjs/common';
import { EmailModule } from '@autoclipr/emails';
import { CouponsModule } from '../coupons/coupons.module';
import { CampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';
import { AdminCampaignsController, CampaignClickController } from './campaigns.controller';

@Module({
  imports: [EmailModule, CouponsModule],
  providers: [CampaignsRepository, CampaignsService],
  controllers: [AdminCampaignsController, CampaignClickController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
