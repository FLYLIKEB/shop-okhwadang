import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterTrackingDto } from './dto/register-tracking.dto';
import { TrackShipmentDto } from './dto/track-shipment.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get(':orderId')
  getByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.shippingService.getByOrderId(orderId, user.id);
  }

  @Post('track')
  track(@Body() dto: TrackShipmentDto) {
    return this.shippingService.track(dto);
  }
}

@Controller('admin/shipping')
export class AdminShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post(':orderId')
  @Roles('admin', 'super_admin')
  registerTracking(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: RegisterTrackingDto,
  ) {
    return this.shippingService.registerTracking(orderId, dto);
  }
}
