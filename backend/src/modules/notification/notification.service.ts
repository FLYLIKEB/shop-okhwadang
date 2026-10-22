import { Injectable, Logger, Inject } from '@nestjs/common';
import { EmailMessage, EmailProvider } from './interfaces/email-provider.interface';
import { NotificationTemplateService } from './notification-template.service';
import { EmailContext, EmailTemplateKey } from './templates/editable-templates';
import {
  type EmailVerificationContext,
  type InquiryAnsweredContext,
  type OrderCancelledContext,
  type OrderConfirmedContext,
  type PaymentConfirmedContext,
  type PasswordResetContext,
  type RestockAlertContext,
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
    private readonly templates: NotificationTemplateService,
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
    await this.sendTemplate(to, 'ORDER_CONFIRMED', context);
  }

  async sendOrderCancelled(to: string, context: OrderCancelledContext): Promise<void> {
    await this.sendTemplate(to, 'ORDER_CANCELLED', context);
  }

  async sendPaymentConfirmed(to: string, context: PaymentConfirmedContext): Promise<void> {
    await this.sendTemplate(to, 'PAYMENT_CONFIRMED', context);
  }

  async sendPaymentConfirmedOrThrow(
    to: string,
    context: PaymentConfirmedContext,
    idempotencyKey: string,
  ): Promise<void> {
    if (!to) {
      throw new Error('sendPaymentConfirmedOrThrow called with empty recipient.');
    }

    const rendered = await this.templates.renderEmail('PAYMENT_CONFIRMED', context);
    const result = await this.provider.send({ to, ...rendered, idempotencyKey });
    this.logger.log(`Email sent: to=${to} messageId=${result.messageId} provider=${result.provider}`);
  }

  async sendShippingUpdate(to: string, context: ShippingUpdateContext): Promise<void> {
    await this.sendTemplate(to, 'SHIPPING_UPDATE', context);
  }

  async sendInquiryAnswered(to: string, context: InquiryAnsweredContext): Promise<void> {
    await this.sendTemplate(to, 'INQUIRY_ANSWERED', context);
  }

  async sendPasswordReset(to: string, context: PasswordResetContext): Promise<void> {
    await this.sendTemplate(to, 'PASSWORD_RESET', context);
  }

  async sendEmailVerification(to: string, context: EmailVerificationContext): Promise<void> {
    await this.sendTemplate(to, 'EMAIL_VERIFICATION', context);
  }

  async sendRestockAlert(to: string, context: RestockAlertContext): Promise<void> {
    await this.sendTemplate(to, 'RESTOCK_ALERT', context);
  }

  private async sendTemplate(to: string, key: EmailTemplateKey, context: EmailContext): Promise<void> {
    try {
      const rendered = await this.templates.renderEmail(key, context);
      await this.sendEmail({ to, ...rendered });
    } catch (error) {
      this.logger.error(`Failed to render email template ${key}: ${String(error)}`);
    }
  }
}
