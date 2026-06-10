import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { parsePagination } from '../../common/utils/pagination';
import { VideosService } from './videos.service';
import { InitUploadDto } from './dto/init-upload.dto';
import { ImportUrlDto } from './dto/import-url.dto';

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload')
  async initUpload(@CurrentUser() user: AuthUser, @Body() dto: InitUploadDto) {
    const data = await this.videosService.initUpload(user.sub, dto);
    return ApiResponse.ok(data);
  }

  @Post('import-url')
  async importUrl(@CurrentUser() user: AuthUser, @Body() dto: ImportUrlDto) {
    const data = await this.videosService.importFromUrl(user.sub, dto);
    return ApiResponse.ok(data);
  }

  @Post(':id/complete')
  async complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.videosService.completeUpload(user.sub, id);
    return ApiResponse.ok(data);
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
    const { items, total } = await this.videosService.list(user.sub, p, l);
    return ApiResponse.ok(items, {
      page: p,
      limit: l,
      total,
      has_more: p * l < total,
    });
  }

  @Get(':id/pipeline')
  async pipeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.videosService.getPipeline(user.sub, id);
    return ApiResponse.ok(data);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const video = await this.videosService.get(user.sub, id);
    return ApiResponse.ok(video);
  }
}
