import { Module } from '@nestjs/common';
import { PlatformsRepository } from './platforms.repository';
import { PlatformsService } from './platforms.service';
import { PlatformsController } from './platforms.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [PlatformsRepository, PlatformsService],
  controllers: [PlatformsController],
  exports: [PlatformsRepository, PlatformsService],
})
export class PlatformsModule {}
