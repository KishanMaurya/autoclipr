import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE } from '../../config/throttle.config';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { parsePagination } from '../../common/utils/pagination';
import { ClipsService } from './clips.service';
import { GenerateClipsDto } from './dto/generate-clips.dto';
import { BulkDownloadDto } from './dto/bulk-download.dto';
import { PublishClipDto } from '../platforms/dto/platform.dto';

@Controller('clips')
@UseGuards(JwtAuthGuard)
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  @Throttle({
    [THROTTLE.expensive.name]: {
      limit: THROTTLE.expensive.limit,
      ttl: THROTTLE.expensive.ttl,
    },
  })
  @Post('generate')
  async generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateClipsDto) {
    const job = await this.clipsService.generate(user.sub, dto);
    return ApiResponse.ok(job);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: p, limit: l } = parsePagination(
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '20', 10),
    );
    const { items, total } = await this.clipsService.list(user.sub, p, l);
    return ApiResponse.ok(items, {
      page: p,
      limit: l,
      total,
      has_more: p * l < total,
    });
  }

  @Post('bulk-download')
  async bulkDownload(@CurrentUser() user: AuthUser, @Body() dto: BulkDownloadDto) {
    const items = await this.clipsService.bulkDownloadUrls(user.sub, dto.clip_ids);
    return ApiResponse.ok({ items });
  }

  @Post(':id/publish')
  async publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PublishClipDto,
  ) {
    const result = await this.clipsService.publish(user.sub, id, dto);
    return ApiResponse.ok(result);
  }

  @Get(':id/publications')
  async publications(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const items = await this.clipsService.getPublications(user.sub, id);
    return ApiResponse.ok(items);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const clip = await this.clipsService.get(user.sub, id);
    return ApiResponse.ok(clip);
  }

  @Post(':id/export')
  async export(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const job = await this.clipsService.export(user.sub, id);
    return ApiResponse.ok(job);
  }
}
