import { Module } from '@nestjs/common';
import { PlatformsModule } from '../platforms/platforms.module';
import { PublicationsRepository } from '../clips/publications.repository';
import { StorageService } from '../storage/storage.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { YoutubeStatsService } from './youtube-stats.service';

@Module({
  imports: [PlatformsModule],
  providers: [
    AnalyticsService,
    YoutubeStatsService,
    PublicationsRepository,
    StorageService,
  ],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
