import {
  Controller, Get, Patch, Post, Param, Body, Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RegisterShippingDto } from './dto/register-shipping.dto';
import { OrderStatus } from '../orders/entities/order.entity';

@ApiTags('관리자 - 주문')
@Controller('admin')
@Roles('admin', 'super_admin')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get('orders')
  @ApiCookieAuth()
  @ApiOperation({ summary: '주문 목록 조회', description: '모든 주문을 필터링하여 조회합니다.' })
  @ApiResponse({ status: 200, description: '주문 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수' })
  @ApiQuery({ name: 'status', required: false, type: String, description: '주문 상태 필터' })
  @ApiQuery({ name: 'search', required: false, type: String, description: '검색어 (주문번호/회원명/이메일)' })
  findAll(@Query() query: AdminOrderQueryDto) {
    return this.adminOrdersService.findAll(query);
  }

  @Patch('orders/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '주문 상태 수정', description: '주문의 상태를 수정합니다.' })
  @ApiResponse({ status: 200, description: '주문 상태 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '주문 ID' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminOrdersService.updateStatus(id, dto.status as OrderStatus);
  }

  @Post('shipping/:orderId')
  @ApiCookieAuth()
  @ApiOperation({ summary: '배송 정보 등록', description: '주문에 배송 정보를 등록합니다.' })
  @ApiResponse({ status: 201, description: '배송 정보 등록 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  @ApiParam({ name: 'orderId', type: Number, description: '주문 ID' })
  registerShipping(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: RegisterShippingDto,
  ) {
    return this.adminOrdersService.registerShipping(orderId, dto);
  }
}
