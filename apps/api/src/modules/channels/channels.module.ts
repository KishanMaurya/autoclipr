import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChannelsRepository } from './channels.repository';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';

@Module({
  providers: [ChannelsRepository, ChannelsService, JwtAuthGuard],
  controllers: [ChannelsController],
  exports: [ChannelsService],
})
export class ChannelsModule {}
