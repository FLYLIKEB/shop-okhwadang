import {
  Controller, Get, Query, Res, UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiCookieAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { AdminExportService } from './admin-export.service';
import { ExportQueryDto } from './dto/export-query.dto';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

@ApiTags('관리자 - 내보내기')
@Controller('admin')
@Roles('admin', 'super_admin')
export class AdminExportController {
  constructor(private readonly adminExportService: AdminExportService) {}

  @Get('orders/export')
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ action: AuditAction.EXPORT_ORDERS, resourceType: 'order' })
  @ApiCookieAuth()
  @ApiOperation({ summary: '주문 내보내기', description: '주문 목록을 CSV 또는 xlsx 형식으로 내보냅니다.' })
  @ApiResponse({ status: 200, description: '파일 다운로드' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'], description: '내보내기 형식' })
  @ApiQuery({ name: 'from', required: false, type: String, description: '시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: '종료 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'mask', required: false, enum: ['true', 'false'], description: '개인정보 마스킹 여부' })
  exportOrders(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    return this.adminExportService.exportOrders(query, res);
  }

  @Get('members/export')
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ action: AuditAction.EXPORT_MEMBERS, resourceType: 'member' })
  @ApiCookieAuth()
  @ApiOperation({ summary: '회원 내보내기', description: '회원 목록을 CSV 또는 xlsx 형식으로 내보냅니다.' })
  @ApiResponse({ status: 200, description: '파일 다운로드' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'], description: '내보내기 형식' })
  @ApiQuery({ name: 'mask', required: false, enum: ['true', 'false'], description: '개인정보 마스킹 여부' })
  exportMembers(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    return this.adminExportService.exportMembers(query, res);
  }

  @Get('products/export')
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ action: AuditAction.EXPORT_PRODUCTS, resourceType: 'product' })
  @ApiCookieAuth()
  @ApiOperation({ summary: '상품 내보내기', description: '상품 목록을 CSV 또는 xlsx 형식으로 내보냅니다.' })
  @ApiResponse({ status: 200, description: '파일 다운로드' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'], description: '내보내기 형식' })
  exportProducts(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    return this.adminExportService.exportProducts(query, res);
  }
}
