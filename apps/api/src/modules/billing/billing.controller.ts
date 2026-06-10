import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller()
export class BillingController {
  constructor(private readonly usersService: UsersService) {}

  @Get('billing/subscription')
  @UseGuards(JwtAuthGuard)
  async subscription(@CurrentUser() user: AuthUser) {
    const data = await this.usersService.getBilling(user.sub);
    return ApiResponse.ok(data);
  }

  @Get('plans')
  plans() {
    return this.usersService.listPlans().then((plans) => ApiResponse.ok(plans));
  }
}
