import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { GuestPreparePaymentDto } from './dto/guest-prepare-payment.dto';
import { GuestConfirmPaymentDto } from './dto/guest-confirm-payment.dto';
import { GuestPaymentsService } from './guest-payments.service';

@ApiTags('게스트 결제')
@Controller('guest/orders')
export class GuestPaymentsController {
  constructor(private readonly guestPaymentsService: GuestPaymentsService) {}

  @Public()
  @Post(':id/payments/prepare')
  @ApiOperation({ summary: '게스트 결제 준비', description: '게스트 주문의 결제를 준비합니다.' })
  @ApiParam({ name: 'id', type: Number, description: '주문 ID' })
  @ApiHeader({ name: 'X-Guest-Access-Token', required: true, description: '게스트 주문 접근 토큰' })
  @ApiResponse({ status: 201, description: '결제 준비 성공' })
  @ApiResponse({ status: 401, description: '게스트 접근 토큰 필요 또는 만료' })
  async prepare(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: GuestPreparePaymentDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.guestPaymentsService.prepare(orderId, dto, this.readGuestAccessToken(headers));
  }

  @Public()
  @Post(':id/payments/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '게스트 결제 승인', description: '게스트 주문의 결제를 확정하고 접근 토큰을 회전합니다.' })
  @ApiParam({ name: 'id', type: Number, description: '주문 ID' })
  @ApiHeader({ name: 'X-Guest-Access-Token', required: true, description: '게스트 주문 접근 토큰' })
  @ApiResponse({ status: 200, description: '결제 승인 성공' })
  @ApiResponse({ status: 401, description: '게스트 접근 토큰 필요 또는 만료' })
  @ApiResponse({ status: 409, description: '이미 처리된 결제' })
  async confirm(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: GuestConfirmPaymentDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.guestPaymentsService.confirm(orderId, dto, this.readGuestAccessToken(headers));
  }

  private readGuestAccessToken(headers: Record<string, string | string[] | undefined>): string {
    const value = headers['x-guest-access-token'] ?? headers['X-Guest-Access-Token'];
    const token = Array.isArray(value) ? value[0] : value;

    if (!token?.trim()) {
      throw new UnauthorizedException('게스트 주문 접근 토큰이 필요합니다.');
    }

    return token.trim();
  }
}
