import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('prepare')
  prepare(@Body() dto: PreparePaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.prepare(dto, user.id);
  }

  @Post('confirm')
  confirm(@Body() dto: ConfirmPaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.confirm(dto, user.id);
  }

  @Post('cancel')
  cancel(@Body() dto: CancelPaymentDto, @CurrentUser() user: { id: number }) {
    return this.paymentsService.cancel(dto, user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() payload: unknown,
    @Headers('toss-signature') signature: string,
  ): Promise<{ received: boolean }> {
    await this.paymentsService.handleWebhook(payload, signature);
    return { received: true };
  }
}
