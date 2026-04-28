import {
  Controller, Post, Param, Body, ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiParam, ApiCookieAuth,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { Refund } from './entities/refund.entity';

@ApiTags('관리자 - 환불')
@ApiCookieAuth()
@Roles('admin', 'super_admin')
@Controller('admin/orders')
export class AdminOrderRefundsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/refunds')
  @ApiOperation({ summary: '부분 환불 처리', description: '주문에 대해 부분 환불을 처리합니다.' })
  @ApiParam({ name: 'id', type: Number, description: '주문 ID' })
  @ApiResponse({ status: 201, description: '환불 처리 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (환불 불가 상태 또는 금액 초과)' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  async create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRefundDto,
  ): Promise<Refund> {
    return this.paymentsService.partialRefund(id, dto);
  }
}
