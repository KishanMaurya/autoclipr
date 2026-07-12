import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

  @Get('audit-logs')
  async auditLogs(@Query('limit') limit?: string, @Query('days') days?: string) {
    const data = await this.service.getAuditLogs(
      limit ? parseInt(limit, 10) : 100,
      days  ? parseInt(days, 10)  : 30,
    );
    return ApiResponse.ok(data);
  }

  @Get('analytics')
  async analytics(@Query('days') days?: string) {
    const data = await this.service.getAnalytics(days ? parseInt(days, 10) : 30);
    return ApiResponse.ok(data);
  }

  @Get('top-creators')
  async topCreators(@Query('limit') limit?: string) {
    const data = await this.service.getTopCreators(limit ? parseInt(limit, 10) : 50);
    return ApiResponse.ok(data);
  }

  @Get('clips-by-user')
  async clipsByUser(@Query('limit') limit?: string) {
    const data = await this.service.getClipsByUser(limit ? parseInt(limit, 10) : 50);
    return ApiResponse.ok(data);
  }

  @Get('errors')
  async errors(@Query('limit') limit?: string) {
    const data = await this.service.getErrors(limit ? parseInt(limit, 10) : 50);
    return ApiResponse.ok(data);
  }
}
