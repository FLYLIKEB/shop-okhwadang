import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmailMessage, EmailProvider, EmailSendResult } from '../interfaces/email-provider.interface';

@Injectable()
export class MockEmailAdapter implements EmailProvider {
  private readonly logger = new Logger(MockEmailAdapter.name);
  private readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.sent.push(message);
    this.logger.log(`[MOCK EMAIL] to=${message.to} subject=${message.subject}`);
    return {
      messageId: `mock-${randomUUID()}`,
      provider: 'mock',
    };
  }

  getSent(): EmailMessage[] {
    return [...this.sent];
  }

  clear(): void {
    this.sent.length = 0;
  }
}
