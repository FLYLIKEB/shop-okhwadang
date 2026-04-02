import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('관리자 - 대시보드')
@Controller('admin')
@Roles('admin', 'super_admin')
export class AdminDashboardController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
  ) {}

  @Get('dashboard')
  @ApiCookieAuth()
  @ApiOperation({ summary: '대시보드 데이터 조회', description: '대시보드에 표시할统计数据를 조회합니다.' })
  @ApiResponse({ status: 200, description: '대시보드 데이터 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiQuery({ name: 'period', required: false, type: String, description: '기간 (today/week/month/year)' })
  getDashboard(@Query() query: DashboardQueryDto) {
    return this.adminDashboardService.getDashboard(query);
  }
}
