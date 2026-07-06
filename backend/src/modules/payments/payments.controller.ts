import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
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
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
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
  prepare(@Body() dto: PreparePaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.prepare(dto, user.id);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: '결제 승인', description: '결제를 확정합니다.' })
  @ApiResponse({ status: 200, description: '결제 확정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  confirm(@Body() dto: ConfirmPaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.confirm(dto, user.id);
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
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: '결제 웹훅', description: 'PG사로부터 결제 상태 변경 웹훅을 수신합니다.' })
  @ApiResponse({ status: 200, description: '웹훅 수신 성공' })
  @ApiHeader({ name: 'toss-signature', description: 'Toss 서명', required: true })
  async webhook(
    @Body() dto: WebhookPayloadDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: boolean }> {
    await this.paymentsService.handleWebhook(dto, buildPaymentWebhookSignature(headers));
    return { received: true };
  }

  @Public()
  @Post('webhook/eximbay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eximbay 결제 웹훅', description: 'Eximbay status_url/webhook 결제 상태를 수신합니다.' })
  @ApiResponse({ status: 200, description: 'Eximbay 웹훅 수신 성공' })
  @ApiHeader({ name: 'eximbay-webhook-signature', description: 'Eximbay HMAC 서명', required: true })
  async eximbayWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: boolean }> {
    await this.paymentsService.handleEximbayWebhook(
      payload,
      getHeader(headers, 'eximbay-webhook-signature') ?? '',
    );
    return { received: true };
  }
}

function buildPaymentWebhookSignature(headers: Record<string, string | string[] | undefined>): string {
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
