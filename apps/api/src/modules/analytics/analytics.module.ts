import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformsModule } from '../platforms/platforms.module';
import { PublicationsRepository } from '../clips/publications.repository';
import { StorageService } from '../storage/storage.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { YoutubeStatsService } from './youtube-stats.service';
import { InstagramStatsService } from './instagram-stats.service';

@Module({
  imports: [PlatformsModule],
  providers: [
    JwtAuthGuard,
    AnalyticsService,
    YoutubeStatsService,
    InstagramStatsService,
    PublicationsRepository,
    StorageService,
  ],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
