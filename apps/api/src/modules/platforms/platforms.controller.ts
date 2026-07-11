import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ApiResponse } from '../../common/api-response';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { ConnectPlatformDto, type PlatformId } from './dto/platform.dto';
import { PlatformsService } from './platforms.service';

@Controller('platforms')
@UseGuards(JwtAuthGuard)
export class PlatformsController {
  constructor(
    private readonly platformsService: PlatformsService,
    private readonly config: ConfigService,
  ) {}

  private webAppUrl(): string {
    return this.config.get<string>('webAppUrl') ?? 'http://localhost:3000';
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const items = await this.platformsService.list(user.sub);
    return ApiResponse.ok(items);
  }

  @Post()
  async connect(@CurrentUser() user: AuthUser, @Body() dto: ConnectPlatformDto) {
    const row = await this.platformsService.connect(user.sub, dto, user.email);
    return ApiResponse.ok(row);
  }

  @Delete(':platform')
  async disconnect(
    @CurrentUser() user: AuthUser,
    @Param('platform') platform: PlatformId,
  ) {
    const result = await this.platformsService.disconnect(user.sub, platform);
    return ApiResponse.ok(result);
  }

  @Get('youtube/oauth-url')
  async youtubeOAuthUrl(@CurrentUser() user: AuthUser) {
    const result = await this.platformsService.getYoutubeOAuthUrl(user.sub);
    return ApiResponse.ok(result);
  }

  @Get('instagram/oauth-url')
  async instagramOAuthUrl(@CurrentUser() user: AuthUser) {
    const result = await this.platformsService.getInstagramOAuthUrl(user.sub);
    return ApiResponse.ok(result);
  }

  @Public()
  @SkipThrottle()
  @Get('instagram/callback')
  async instagramCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const webUrl = this.webAppUrl();

    if (error || !code || !state) {
      return res.redirect(
        `${webUrl}/setup/platforms?from=oauth&platform=instagram&status=error`,
      );
    }

    try {
      const redirect = await this.platformsService.handleInstagramCallback(code, state);
      return res.redirect(redirect);
    } catch {
      return res.redirect(
        `${webUrl}/setup/platforms?from=oauth&platform=instagram&status=error`,
      );
    }
  }

  @Public()
  @SkipThrottle()
  @Get('youtube/callback')
  async youtubeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const webUrl = this.webAppUrl();

    if (error || !code || !state) {
      return res.redirect(
        `${webUrl}/setup/platforms?from=oauth&platform=youtube&status=error`,
      );
    }

    try {
      const redirect = await this.platformsService.handleYoutubeCallback(code, state);
      return res.redirect(redirect);
    } catch {
      return res.redirect(
        `${webUrl}/setup/platforms?from=oauth&platform=youtube&status=error`,
      );
    }
  }
}
