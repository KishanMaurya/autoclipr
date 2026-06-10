import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { UsersModule } from '../users/users.module';
import { StorageService } from '../storage/storage.service';
import { VideosRepository } from './videos.repository';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';

@Module({
  imports: [JobsModule, UsersModule],
  providers: [VideosRepository, VideosService, StorageService],
  controllers: [VideosController],
})
export class VideosModule {}
