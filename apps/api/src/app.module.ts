import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { bullMqConnectionOptions } from './config/redis-connection';
import { throttlerModuleOptions } from './config/throttle.config';
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
    ThrottlerModule.forRoot(throttlerModuleOptions),
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
  providers: [
    RedisHealthService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
