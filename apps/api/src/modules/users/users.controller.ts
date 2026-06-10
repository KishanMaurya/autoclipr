import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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

  @Delete('me')
  async deleteMe(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    await this.usersService.deleteAccount(user.sub);
    return ApiResponse.ok({ deleted: true });
  }
}
