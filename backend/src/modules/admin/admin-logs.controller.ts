import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminLogsService } from './admin-logs.service';
import { AdminLogQueryDto } from './dto/admin-log-query.dto';

@ApiTags('관리자 - 원격 로그')
@Controller('admin/logs')
@Roles('super_admin')
export class AdminLogsController {
  constructor(private readonly adminLogsService: AdminLogsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '원격 PM2 로그 조회', description: '운영 서버의 최근 일반/에러 로그를 조회합니다.' })
  @ApiResponse({ status: 200, description: '원격 로그 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  getLogs(@Query() query: AdminLogQueryDto) {
    return this.adminLogsService.getLogs(query.type, query.lines);
  }
}
