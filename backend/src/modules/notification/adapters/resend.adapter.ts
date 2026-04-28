import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailProvider, EmailSendResult } from '../interfaces/email-provider.interface';
import {
  NOTIFICATION_CONFIG,
  NotificationConfig,
} from '../../../config/notification.config';

@Injectable()
export class ResendEmailAdapter implements EmailProvider {
  private readonly logger = new Logger(ResendEmailAdapter.name);
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor(
    @Inject(NOTIFICATION_CONFIG)
    config: NotificationConfig,
  ) {
    this.apiKey = config.resend.apiKey;
    this.fromAddress = config.resend.fromAddress;
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not set — ResendEmailAdapter will fail on send.');
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.apiKey) {
      throw new Error('RESEND_API_KEY is not configured.');
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error: ${res.status} ${body}`);
    }

    const data = (await res.json()) as { id?: string };
    return {
      messageId: data.id ?? '',
      provider: 'resend',
    };
  }
}
