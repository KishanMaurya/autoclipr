import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InitAvatarUploadDto } from './dto/init-avatar-upload.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const profile = await this.usersService.getMe(user.sub);
    return ApiResponse.ok(profile);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    const profile = await this.usersService.updateProfile(user.sub, dto);
    return ApiResponse.ok(profile);
  }

  @Post('me/heartbeat')
  async heartbeat(@CurrentUser() user: AuthUser) {
    await this.usersService.heartbeat(user.sub);
    return ApiResponse.ok({ ok: true });
  }

  @Post('me/avatar/upload')
  async initAvatarUpload(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitAvatarUploadDto,
  ) {
    const data = await this.usersService.initAvatarUpload(user.sub, dto);
    return ApiResponse.ok(data);
  }

  @Delete('me')
  async deleteMe(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    await this.usersService.deleteAccount(user.sub);
    return ApiResponse.ok({ deleted: true });
  }
}
