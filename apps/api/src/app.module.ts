import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { bullMqConnectionOptions } from './config/redis-connection';
import { RedisHealthService } from './redis/redis-health.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VideosModule } from './modules/videos/videos.module';
import { ClipsModule } from './modules/clips/clips.module';
import { BillingModule } from './modules/billing/billing.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env', '../../../.env'],
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: bullMqConnectionOptions(),
      }),
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    VideosModule,
    ClipsModule,
    BillingModule,
    JobsModule,
    ChannelsModule,
    PlatformsModule,
    AnalyticsModule,
  ],
  providers: [RedisHealthService],
})
export class AppModule {}
