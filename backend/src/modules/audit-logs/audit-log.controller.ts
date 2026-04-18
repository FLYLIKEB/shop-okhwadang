import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('관리자 - 감사 로그')
@Controller('admin/audit-logs')
@Roles('admin', 'super_admin')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '감사 로그 목록 조회', description: '페이지네이션 및 필터링된 감사 로그를 조회합니다.' })
  @ApiResponse({ status: 200, description: '감사 로그 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAll({
      page: query.page,
      limit: query.limit,
      actorId: query.actorId,
      actorRole: query.actorRole,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      ip: query.ip,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }
}