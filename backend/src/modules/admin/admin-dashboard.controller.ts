import { Controller, Get, Query } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@Roles('admin', 'super_admin')
export class AdminDashboardController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
  ) {}

  @Get('dashboard')
  getDashboard(@Query() query: DashboardQueryDto) {
    return this.adminDashboardService.getDashboard(query);
  }
}
