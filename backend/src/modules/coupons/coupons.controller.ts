import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { AdminCouponListQueryDto } from './dto/admin-coupon-list-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { AuthenticatedRequestWithAuthUser } from '../../common/interfaces/auth-user.interface';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

@ApiTags('쿠폰')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '내 쿠폰 목록 조회', description: '현재 사용자가 보유한 쿠폰 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '쿠폰 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiQuery({ name: 'status', required: false, type: String, description: '쿠폰 상태 (available/used/expired)' })
  findAll(
    @Request() req: AuthenticatedRequestWithAuthUser,
    @Query('status') status?: string,
  ) {
    return this.couponsService.findAll(req.user.id, status);
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: '할인 금액 계산', description: '쿠폰 적용 시 할인 금액을 계산합니다.' })
  @ApiResponse({ status: 200, description: '할인 금액 계산 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  calculate(
    @Request() req: AuthenticatedRequestWithAuthUser,
    @Body() dto: CalculateDiscountDto,
  ) {
    return this.couponsService.calculate(req.user.id, dto);
  }

  @Get('points')
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 포인트 조회', description: '현재 사용자의 쿠폰 포인트를 조회합니다.' })
  @ApiResponse({ status: 200, description: '쿠폰 포인트 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  getPoints(@Request() req: AuthenticatedRequestWithAuthUser) {
    return this.couponsService.getPoints(req.user.id);
  }
}

@ApiTags('관리자 - 쿠폰')
@Controller('admin/coupons')
@Roles('admin', 'super_admin')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 목록 조회' })
  @ApiResponse({ status: 200, description: '쿠폰 목록 조회 성공' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수' })
  findCoupons(@Query() query: AdminCouponListQueryDto) {
    return this.couponsService.findAdminCoupons(query);
  }

  @Get(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 단건 조회' })
  @ApiResponse({ status: 200, description: '쿠폰 조회 성공' })
  @ApiResponse({ status: 404, description: '쿠폰을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '쿠폰 ID' })
  findCoupon(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.findAdminCoupon(id);
  }

  @Post()
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ action: AuditAction.COUPON_CREATE, resourceType: 'coupon' })
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 생성', description: '새로운 쿠폰을 생성합니다.' })
  @ApiResponse({ status: 201, description: '쿠폰 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Patch(':id')
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ action: AuditAction.COUPON_UPDATE, resourceType: 'coupon' })
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 수정' })
  @ApiResponse({ status: 200, description: '쿠폰 수정 성공' })
  @ApiResponse({ status: 400, description: '이미 발급된 쿠폰의 제한 필드 수정 또는 수량 부족' })
  @ApiResponse({ status: 404, description: '쿠폰을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '쿠폰 ID' })
  updateCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.updateCoupon(id, dto);
  }

  @Delete(':id')
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ action: AuditAction.COUPON_DELETE, resourceType: 'coupon' })
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 삭제' })
  @ApiResponse({ status: 200, description: '쿠폰 삭제 성공' })
  @ApiResponse({ status: 400, description: '이미 발급된 쿠폰은 삭제할 수 없음' })
  @ApiResponse({ status: 404, description: '쿠폰을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '쿠폰 ID' })
  removeCoupon(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.removeCoupon(id);
  }

  @Post('issue')
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 발급', description: '사용자에게 쿠폰을 발급합니다.' })
  @ApiResponse({ status: 201, description: '쿠폰 발급 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  issueCoupon(@Body() dto: IssueCouponDto) {
    return this.couponsService.issueCoupon(dto);
  }
}
