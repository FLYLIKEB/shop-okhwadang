import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('결제')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('prepare')
  @ApiCookieAuth()
  @ApiOperation({ summary: '결제 준비', description: '결제를 위한 사전准备工作을 수행합니다.' })
  @ApiResponse({ status: 201, description: '결제 준비 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  prepare(@Body() dto: PreparePaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.prepare(dto, user.id);
  }

  @Post('confirm')
  @ApiCookieAuth()
  @ApiOperation({ summary: '결제 승인', description: '결제를 확정합니다.' })
  @ApiResponse({ status: 200, description: '결제 확정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  confirm(@Body() dto: ConfirmPaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.confirm(dto, user.id);
  }

  @Post('cancel')
  @ApiCookieAuth()
  @ApiOperation({ summary: '결제 취소', description: '결제를 취소합니다.' })
  @ApiResponse({ status: 200, description: '결제 취소 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  cancel(@Body() dto: CancelPaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.cancel(dto, user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: '결제 웹훅', description: 'PG사로부터 결제 상태 변경 웹훅을 수신합니다.' })
  @ApiResponse({ status: 200, description: '웹훅 수신 성공' })
  @ApiHeader({ name: 'toss-signature', description: 'Toss 서명', required: true })
  async webhook(
    @Body() payload: unknown,
    @Headers('toss-signature') signature: string,
  ): Promise<{ received: boolean }> {
    await this.paymentsService.handleWebhook(payload, signature);
    return { received: true };
  }
}
