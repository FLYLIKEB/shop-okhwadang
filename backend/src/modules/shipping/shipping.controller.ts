import { Controller, Get, Post, Body, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterTrackingDto } from './dto/register-tracking.dto';
import { TrackShipmentDto } from './dto/track-shipment.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('배송')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get(':orderId')
  @ApiCookieAuth()
  @ApiOperation({ summary: '주문 배송 조회', description: '특정 주문의 배송 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '배송 정보 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '배송 정보를 찾을 수 없음' })
  @ApiParam({ name: 'orderId', type: Number, description: '주문 ID' })
  getByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.shippingService.getByOrderId(orderId, user.id);
  }

  @Post('track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '배송 추적', description: '운송장 번호로 배송을 추적합니다.' })
  @ApiResponse({ status: 200, description: '배송 추적 성공' })
  track(@Body() dto: TrackShipmentDto) {
    return this.shippingService.track(dto);
  }
}

@ApiTags('관리자 - 배송')
@Controller('admin/shipping')
export class AdminShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post(':orderId')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '운송장 등록', description: '주문에 운송장 번호를 등록합니다.' })
  @ApiResponse({ status: 201, description: '운송장 등록 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiParam({ name: 'orderId', type: Number, description: '주문 ID' })
  registerTracking(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: RegisterTrackingDto,
  ) {
    return this.shippingService.registerTracking(orderId, dto);
  }
}
