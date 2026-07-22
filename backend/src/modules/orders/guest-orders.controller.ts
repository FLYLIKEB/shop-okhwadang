import { Body, Controller, Get, Headers, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalLocalePipe } from '../../common/pipes/optional-locale.pipe';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { LookupGuestOrderDto } from './dto/lookup-guest-order.dto';
import { GuestOrdersService } from './guest-orders.service';

@ApiTags('비회원 주문')
@Public()
@Controller('guest/orders')
export class GuestOrdersController {
  constructor(private readonly guestOrdersService: GuestOrdersService) {}

  @Post()
  @Throttle({ guestCreate: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: '비회원 주문 생성', description: '회원 로그인 없이 주문을 생성하고 접근 토큰을 발급합니다.' })
  @ApiResponse({ status: 201, description: '비회원 주문 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 오류' })
  @ApiResponse({ status: 429, description: '요청 한도 초과' })
  create(@Body() dto: CreateGuestOrderDto) {
    return this.guestOrdersService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '비회원 주문 상세 조회', description: '비회원 주문 접근 토큰으로 주문 상세를 조회합니다.' })
  @ApiParam({ name: 'id', type: Number, description: '주문 ID' })
  @ApiHeader({ name: 'X-Guest-Access-Token', required: true, description: '비회원 주문 접근 토큰' })
  @ApiResponse({ status: 200, description: '비회원 주문 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '비회원 주문 접근 토큰이 유효하지 않음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  getById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-guest-access-token') guestAccessToken: string | undefined,
    @Query('locale', OptionalLocalePipe) locale?: string,
  ) {
    return this.guestOrdersService.getById(id, guestAccessToken, locale as 'ko' | 'en' | undefined);
  }

  @Post('lookup')
  @Throttle({ guestLookup: { limit: 5, ttl: 60000 } })
  @HttpCode(200)
  @ApiOperation({ summary: '비회원 주문 조회용 토큰 재발급', description: '주문 번호와 이메일로 비회원 주문을 확인하고 새 접근 토큰을 발급합니다.' })
  @ApiResponse({ status: 200, description: '비회원 주문 조회 성공' })
  @ApiResponse({ status: 400, description: '입력값 오류' })
  @ApiResponse({ status: 404, description: '주문 번호와 이메일이 일치하는 주문을 찾을 수 없음' })
  @ApiResponse({ status: 429, description: '요청 한도 초과' })
  lookup(@Body() dto: LookupGuestOrderDto) {
    return this.guestOrdersService.lookup(dto);
  }
}
