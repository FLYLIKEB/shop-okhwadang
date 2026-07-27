import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequestWithAuthUser } from '../../common/interfaces/auth-user.interface';
import { PointsService } from './points.service';
import { ManualPointAdjustmentDto } from './dto/manual-point-adjustment.dto';

@ApiTags('관리자 - 적립금')
@Controller('admin/points')
@Roles('admin', 'super_admin')
export class AdminPointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('users/:userId')
  @ApiCookieAuth()
  @ApiOperation({ summary: '회원 적립금 잔액 조회' })
  @ApiResponse({ status: 200, description: '잔액 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  @ApiParam({ name: 'userId', type: Number, description: '회원 ID' })
  getUserPoints(@Param('userId', ParseIntPipe) userId: number) {
    return this.pointsService.getUserPointSummary(userId);
  }

  @Get('users/:userId/history')
  @ApiCookieAuth()
  @ApiOperation({ summary: '회원 적립금 내역 조회' })
  @ApiResponse({ status: 200, description: '내역 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  @ApiParam({ name: 'userId', type: Number, description: '회원 ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수' })
  getUserPointHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pointsService.getUserPointHistoryForAdmin(userId, page, limit);
  }

  @Post('adjustments')
  @ApiCookieAuth()
  @ApiOperation({ summary: '관리자 수동 적립금 조정' })
  @ApiResponse({ status: 201, description: '조정 성공' })
  @ApiResponse({ status: 400, description: '0 포인트 조정 또는 잔액 부족' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  createAdjustment(
    @Body() dto: ManualPointAdjustmentDto,
    @Request() req: AuthenticatedRequestWithAuthUser & { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.pointsService.adjustPointsManually(
      {
        actorId: req.user.id,
        actorRole: req.user.role,
        ip: req.ip ?? null,
        userAgent: Array.isArray(req.headers?.['user-agent'])
          ? req.headers['user-agent'][0] ?? null
          : req.headers?.['user-agent'] ?? null,
      },
      dto,
    );
  }
}
