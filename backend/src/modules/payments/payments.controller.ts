import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Param, Req } from '@nestjs/common';
import { Request } from 'express';
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
  @ApiOperation({ summary: '결제 준비', description: '결제를 위한 사전 준비 작업을 수행합니다.' })
  @ApiResponse({ status: 201, description: '결제 준비 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: '재시도 식별 키' })
  prepare(@Body() dto: PreparePaymentDto, @CurrentUser() user: { id: number }, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.paymentsService.prepare(dto, user.id, idempotencyKey);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: '결제 승인', description: '결제를 확정합니다.' })
  @ApiResponse({ status: 200, description: '결제 확정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: '재시도 식별 키' })
  confirm(@Body() dto: ConfirmPaymentDto, @CurrentUser() user: { id: number }, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.paymentsService.confirm(dto, user.id, idempotencyKey);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: '결제 취소', description: '결제를 취소합니다.' })
  @ApiResponse({ status: 200, description: '결제 취소 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  cancel(@Body() dto: CancelPaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.cancel(dto, user.id);
  }

  @Public()
  @Post('webhook/:provider')
  @HttpCode(200)
  @ApiOperation({ summary: '결제 웹훅', description: 'PG사로부터 결제 상태 변경 웹훅을 수신합니다.' })
  @ApiResponse({ status: 200, description: '웹훅 수신 성공' })
  @ApiHeader({ name: 'toss-signature', description: 'Toss 서명', required: true })
  async webhook(
    @Body() dto: Record<string, unknown>,
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: Request & { rawBody?: Buffer },
  ): Promise<{ received: boolean }> {
    await this.paymentsService.handleWebhook(
      provider,
      dto,
      provider === 'eximbay'
        ? getHeader(headers, 'eximbay-webhook-signature') ?? ''
        : buildPaymentWebhookSignature(headers, provider),
      request.rawBody,
    );
    return { received: true };
  }
}

function buildPaymentWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  provider: string,
): string {
  if (provider === 'stripe') return getHeader(headers, 'stripe-signature') ?? '';
  if (provider === 'inicis') return getHeader(headers, 'inicis-signature') ?? '';
  const tossSignature = getHeader(headers, 'toss-signature');
  const paypalTransmissionSig = getHeader(headers, 'paypal-transmission-sig');

  if (!paypalTransmissionSig) return tossSignature ?? '';

  return JSON.stringify({
    auth_algo: getHeader(headers, 'paypal-auth-algo'),
    cert_url: getHeader(headers, 'paypal-cert-url'),
    transmission_id: getHeader(headers, 'paypal-transmission-id'),
    transmission_sig: paypalTransmissionSig,
    transmission_time: getHeader(headers, 'paypal-transmission-time'),
  });
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
