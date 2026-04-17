import { Injectable, Logger, Inject } from '@nestjs/common';
import { EmailMessage, EmailProvider } from './interfaces/email-provider.interface';
import {
  renderInquiryAnswered,
  renderOrderConfirmed,
  renderPaymentConfirmed,
  renderShippingUpdate,
  type InquiryAnsweredContext,
  type OrderConfirmedContext,
  type PaymentConfirmedContext,
  type ShippingUpdateContext,
} from './templates/render';

export const EMAIL_PROVIDER_TOKEN = 'EmailProvider';

/**
 * NotificationService
 *
 * Fire-and-forget 이메일 발송. send failures are logged but never thrown —
 * business flows (주문/결제/배송/문의 답변) must not break when the email
 * provider is unavailable.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly provider: EmailProvider,
  ) {}

  async sendEmail(message: EmailMessage): Promise<void> {
    if (!message.to) {
      this.logger.warn('sendEmail called with empty recipient — skipped.');
      return;
    }
    try {
      const result = await this.provider.send(message);
      this.logger.log(`Email sent: to=${message.to} messageId=${result.messageId} provider=${result.provider}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${message.to}: ${String(err)}`);
    }
  }

  async sendOrderConfirmed(to: string, context: OrderConfirmedContext): Promise<void> {
    const rendered = renderOrderConfirmed(context);
    await this.sendEmail({ to, ...rendered });
  }

  async sendPaymentConfirmed(to: string, context: PaymentConfirmedContext): Promise<void> {
    const rendered = renderPaymentConfirmed(context);
    await this.sendEmail({ to, ...rendered });
  }

  async sendShippingUpdate(to: string, context: ShippingUpdateContext): Promise<void> {
    const rendered = renderShippingUpdate(context);
    await this.sendEmail({ to, ...rendered });
  }

  async sendInquiryAnswered(to: string, context: InquiryAnsweredContext): Promise<void> {
    const rendered = renderInquiryAnswered(context);
    await this.sendEmail({ to, ...rendered });
  }
}
