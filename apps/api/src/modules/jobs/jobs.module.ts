import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';
import { CLIP_QUEUE } from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: CLIP_QUEUE,
    }),
  ],
  providers: [JobsRepository, JobsService],
  exports: [JobsService, JobsRepository, BullModule],
})
export class JobsModule {}
