import {
  Body,
  Controller,
  Delete,
  Get,
  BadRequestException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { ChannelsService } from './channels.service';
import { ConnectChannelDto } from './dto/connect-channel.dto';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const channels = await this.channelsService.list(user.sub);
    return ApiResponse.ok(channels);
  }

  @Public()
  @Get('resolve')
  async resolve(@Query('q') q: string) {
    if (!q?.trim()) {
      throw new BadRequestException('Channel name or URL is required');
    }
    const resolved = await this.channelsService.resolveChannel(q);
    return ApiResponse.ok(resolved);
  }

  @Post()
  async connect(@CurrentUser() user: AuthUser, @Body() dto: ConnectChannelDto) {
    const channel = await this.channelsService.connect(user.sub, dto);
    return ApiResponse.ok(channel);
  }

  @Delete(':id')
  async disconnect(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.channelsService.disconnect(user.sub, id);
    return ApiResponse.ok(result);
  }
}
