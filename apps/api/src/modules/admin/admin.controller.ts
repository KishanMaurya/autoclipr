import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  async stats() {
    const data = await this.service.getExecutiveDashboard();
    return ApiResponse.ok(data);
  }
}
