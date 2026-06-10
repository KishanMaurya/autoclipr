import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { UsersModule } from '../users/users.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { VideosRepository } from '../videos/videos.repository';
import { ClipsRepository } from './clips.repository';
import { PublicationsRepository } from './publications.repository';
import { ClipsService } from './clips.service';
import { ClipsController } from './clips.controller';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [JobsModule, UsersModule, PlatformsModule],
  providers: [
    ClipsRepository,
    PublicationsRepository,
    ClipsService,
    VideosRepository,
    StorageService,
  ],
  controllers: [ClipsController],
})
export class ClipsModule {}
