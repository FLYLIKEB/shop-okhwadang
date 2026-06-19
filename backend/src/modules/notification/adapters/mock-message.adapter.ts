import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MessageProvider,
  MessageSendResult,
  TransactionalMessage,
} from '../interfaces/message-provider.interface';

@Injectable()
export class MockMessageAdapter implements MessageProvider {
  private readonly logger = new Logger(MockMessageAdapter.name);
  private readonly sent: TransactionalMessage[] = [];

  async send(message: TransactionalMessage): Promise<MessageSendResult> {
    this.sent.push(message);
    this.logger.log(`[MOCK MESSAGE] to=${this.mask(message.to)} template=${message.templateKey}`);
    return {
      provider: 'mock',
      providerMessageId: `mock-message-${randomUUID()}`,
      channel: 'kakao_alimtalk',
      status: 'sent',
    };
  }

  getSent(): TransactionalMessage[] {
    return [...this.sent];
  }

  clear(): void {
    this.sent.length = 0;
  }

  private mask(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  }
}
