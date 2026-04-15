import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { Roles } from '../../common/decorators/roles.decorator';

interface JwtUser {
  id: number;
  role: string;
}

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
    @Request() req: { user: JwtUser },
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
    @Request() req: { user: JwtUser },
    @Body() dto: CalculateDiscountDto,
  ) {
    return this.couponsService.calculate(req.user.id, dto);
  }

  @Get('points')
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 포인트 조회', description: '현재 사용자의 쿠폰 포인트를 조회합니다.' })
  @ApiResponse({ status: 200, description: '쿠폰 포인트 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  getPoints(@Request() req: { user: JwtUser }) {
    return this.couponsService.getPoints(req.user.id);
  }
}

@ApiTags('관리자 - 쿠폰')
@Controller('admin/coupons')
@Roles('admin', 'super_admin')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 생성', description: '새로운 쿠폰을 생성합니다.' })
  @ApiResponse({ status: 201, description: '쿠폰 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
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
