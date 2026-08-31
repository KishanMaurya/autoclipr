import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RetentionService } from './retention.service';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('admin/retention')
@UseGuards(JwtAuthGuard, AdminGuard)
export class RetentionController {
  constructor(private readonly service: RetentionService) {}

  @Get('preview')
  @ApiOperation({
    summary: 'Preview the Starter retention sweep',
    description:
      'Lists the users who would be emailed and the videos that would be deleted, without sending or deleting anything. Run this before enabling the sweep.',
  })
  async preview() {
    const result = await this.service.runSweep({ dryRun: true });
    return ApiResponse.ok(result);
  }

  @Post('run')
  @ApiOperation({
    summary: 'Run the Starter retention sweep now',
    description:
      'Sends pending warning emails and permanently deletes videos whose warning has aged past the grace period. Irreversible.',
  })
  async run() {
    const result = await this.service.runSweep({ dryRun: false });
    return ApiResponse.ok(result);
  }
}
