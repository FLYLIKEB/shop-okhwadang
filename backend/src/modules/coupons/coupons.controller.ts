import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { Roles } from '../../common/decorators/roles.decorator';

interface JwtUser {
  id: number;
  role: string;
}

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  findAll(
    @Request() req: { user: JwtUser },
    @Query('status') status?: string,
  ) {
    return this.couponsService.findAll(req.user.id, status);
  }

  @Post('calculate')
  calculate(
    @Request() req: { user: JwtUser },
    @Body() dto: CalculateDiscountDto,
  ) {
    return this.couponsService.calculate(req.user.id, dto);
  }

  @Get('points')
  getPoints(@Request() req: { user: JwtUser }) {
    return this.couponsService.getPoints(req.user.id);
  }
}

@Controller('admin/coupons')
@Roles('admin', 'super_admin')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Post('issue')
  issueCoupon(@Body() dto: IssueCouponDto) {
    return this.couponsService.issueCoupon(dto);
  }
}
