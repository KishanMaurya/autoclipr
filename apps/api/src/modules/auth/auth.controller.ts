import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { SyncProfileDto } from './dto/sync-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async sync(@CurrentUser() user: AuthUser, @Body() dto: SyncProfileDto) {
    const profile = await this.authService.syncProfile(
      user.sub,
      user.email ?? '',
      dto.full_name ?? '',
      dto.avatar_url ?? '',
      dto.phone ?? '',
    );
    return ApiResponse.ok(profile);
  }
}
