import { Module } from '@nestjs/common';
import { EmailModule } from '@autoclipr/emails';
import { VideosModule } from '../videos/videos.module';
import { RetentionRepository } from './retention.repository';
import { RetentionService } from './retention.service';
import { RetentionController } from './retention.controller';

@Module({
  imports: [EmailModule, VideosModule],
  providers: [RetentionRepository, RetentionService],
  controllers: [RetentionController],
  exports: [RetentionService],
})
export class RetentionModule {}
