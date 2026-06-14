import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import workersConfig from './config/workers.config';
import { bullMqConnectionOptions } from './config/redis-connection';
import { RedisHealthService } from './redis/redis-health.service';
import { DatabaseService } from './database/database.service';
import { ClipProcessor } from './processors/clip.processor';
import { CLIP_QUEUE } from './jobs.constants';
import { CaptionService } from './pipeline/caption.service';
import { FfmpegService } from './pipeline/ffmpeg.service';
import { HookAnalysisService } from './pipeline/hook-analysis.service';
import { TempFilesService } from './pipeline/temp-files.service';
import { UrlPipelineService } from './pipeline/url-pipeline.service';
import { PublishService } from './publish/publish.service';
import { YoutubePublisherService } from './publish/youtube-publisher.service';
import { WhisperService } from './pipeline/whisper.service';
import { WorkersStorageService } from './pipeline/storage.service';
import { YtdlpService } from './pipeline/ytdlp.service';
import { MonitoringModule } from './monitoring/monitoring.module';
import { QueueMetricsService } from './monitoring/queue-metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../../../.env'],
      load: [workersConfig],
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: bullMqConnectionOptions(),
      }),
    }),
    BullModule.registerQueue({ name: CLIP_QUEUE }),
    MonitoringModule,
  ],
  providers: [
    DatabaseService,
    RedisHealthService,
    QueueMetricsService,
    ClipProcessor,
    TempFilesService,
    YtdlpService,
    FfmpegService,
    WorkersStorageService,
    WhisperService,
    HookAnalysisService,
    CaptionService,
    UrlPipelineService,
    PublishService,
    YoutubePublisherService,
  ],
})
export class WorkersModule {}
