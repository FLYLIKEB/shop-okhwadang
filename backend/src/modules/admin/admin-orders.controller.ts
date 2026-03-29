import {
  Controller, Get, Patch, Post, Param, Body, Query,
  ParseIntPipe,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RegisterShippingDto } from './dto/register-shipping.dto';
import { OrderStatus } from '../orders/entities/order.entity';

@Controller('admin')
@Roles('admin', 'super_admin')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get('orders')
  findAll(@Query() query: AdminOrderQueryDto) {
    return this.adminOrdersService.findAll(query);
  }

  @Patch('orders/:id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminOrdersService.updateStatus(id, dto.status as OrderStatus);
  }

  @Post('shipping/:orderId')
  registerShipping(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: RegisterShippingDto,
  ) {
    return this.adminOrdersService.registerShipping(orderId, dto);
  }
}
