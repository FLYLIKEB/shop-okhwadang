import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { OrderServiceRequestsService } from './order-service-requests.service';
import { CreateOrderServiceRequestDto } from './dto/create-order-service-request.dto';
import { UpdateOrderServiceRequestDto } from './dto/update-order-service-request.dto';
import { AdminOrderServiceRequestQueryDto } from './dto/admin-order-service-request-query.dto';

@ApiTags('주문 신청')
@Controller('orders/:orderId/service-requests')
export class OrderServiceRequestsController {
  constructor(private readonly service: OrderServiceRequestsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '내 주문 취소/교환/반품/환불 신청 목록' })
  @ApiResponse({ status: 200, description: '신청 목록 조회 성공' })
  @ApiParam({ name: 'orderId', type: Number })
  findByOrder(@Param('orderId', ParseIntPipe) orderId: number, @CurrentUser() user: AuthUser) {
    return this.service.findByOrderForUser(orderId, user.id);
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '주문 취소/교환/반품/환불 신청 생성' })
  @ApiResponse({ status: 201, description: '신청 생성 성공' })
  @ApiParam({ name: 'orderId', type: Number })
  create(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderServiceRequestDto,
  ) {
    return this.service.create(orderId, user.id, dto);
  }
}

@ApiTags('관리자 - 주문 신청')
@Controller('admin/order-service-requests')
@Roles('admin', 'super_admin')
export class AdminOrderServiceRequestsController {
  constructor(private readonly service: OrderServiceRequestsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '주문 취소/교환/반품/환불 신청 관리 목록' })
  findAll(@Query() query: AdminOrderServiceRequestQueryDto) {
    return this.service.findAllForAdmin(query);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '주문 신청 처리 상태 변경' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderServiceRequestDto) {
    return this.service.updateForAdmin(id, dto);
  }
}
