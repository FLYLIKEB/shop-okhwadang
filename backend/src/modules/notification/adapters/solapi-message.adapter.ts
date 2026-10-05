import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { createHmac, randomUUID } from 'crypto';
import {
  AmbiguousMessageDeliveryError,
  MessageProvider,
  MessageSendResult,
  TransactionalMessage,
} from '../interfaces/message-provider.interface';
import { NOTIFICATION_CONFIG, NotificationConfig } from '../../../config/notification.config';

interface SolapiMessageResult {
  messageId?: string;
  statusCode?: string;
  statusMessage?: string;
  type?: string;
  customFields?: { requestId?: string };
}

interface SolapiSendResponse {
  messageList?: SolapiMessageResult[];
  failedMessageList?: SolapiMessageResult[];
}

@Injectable()
export class SolapiMessageAdapter implements MessageProvider {
  constructor(
    @Inject(NOTIFICATION_CONFIG)
    private readonly config: NotificationConfig,
  ) {}

  async send(message: TransactionalMessage): Promise<MessageSendResult> {
    let response;
    try {
      response = await axios.post<SolapiSendResponse>(
        `${this.config.message.solapi.apiBaseUrl}/messages/v4/send-many/detail`,
        { messages: [this.buildPayload(message)], showMessageList: true },
        { headers: { Authorization: this.buildAuthorizationHeader(), 'Content-Type': 'application/json' } },
      );
    } catch (error) {
      throw new AmbiguousMessageDeliveryError('SOLAPI delivery outcome is unknown', message.idempotencyKey, error);
    }
    const accepted = response.data.messageList ?? [];
    const failed = response.data.failedMessageList ?? [];
    if (accepted.length + failed.length !== 1) {
      throw new AmbiguousMessageDeliveryError('SOLAPI acceptance outcome is unknown', message.idempotencyKey);
    }
    const result = accepted[0] ?? failed[0];
    if (result.customFields?.requestId && result.customFields.requestId !== message.idempotencyKey) {
      throw new AmbiguousMessageDeliveryError('SOLAPI response request ID mismatch', message.idempotencyKey);
    }
    const channel = result.type === 'SMS'
      ? 'sms'
      : result.type === 'LMS'
        ? 'lms'
        : this.config.message.channel === 'alimtalk'
          ? 'kakao_alimtalk'
          : this.smsByteLength(message.fallbackText) > 90 ? 'lms' : 'sms';
    if (failed.length === 1) {
      return { provider: 'solapi', providerMessageId: result.messageId ?? '', channel, status: 'failed', errorMessage: result.statusMessage ?? `SOLAPI rejected message (${result.statusCode ?? 'unknown'})` };
    }
    if (!result.messageId || result.statusCode !== '2000') {
      throw new AmbiguousMessageDeliveryError('SOLAPI acceptance outcome is unknown', message.idempotencyKey);
    }
    return { provider: 'solapi', providerMessageId: result.messageId, channel, status: 'sent' };
  }

  private buildPayload(message: TransactionalMessage): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      to: message.to,
      from: this.config.message.senderPhone,
      text: message.fallbackText,
      autoTypeDetect: true,
      customFields: { requestId: message.idempotencyKey },
    };
    if (this.config.message.channel === 'alimtalk') {
      payload.kakaoOptions = {
        pfId: this.config.message.kakaoChannelId,
        templateId: message.templateId,
        variables: Object.fromEntries(Object.entries(message.variables).map(([key, value]) => [
          key.startsWith('#{') && key.endsWith('}') ? key : `#{${key}}`, value,
        ])),
        disableSms: !message.smsFallbackEnabled,
      };
    }
    return payload;
  }

  private smsByteLength(text: string): number {
    return [...text].reduce((bytes, char) => bytes + (/^[\x00-\x7f]$/.test(char) ? 1 : 2), 0);
  }

  private buildAuthorizationHeader(): string {
    const date = new Date().toISOString();
    const salt = randomUUID();
    const signature = createHmac('sha256', this.config.message.solapi.apiSecret)
      .update(date + salt)
      .digest('hex');

    return `HMAC-SHA256 apiKey=${this.config.message.solapi.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
  }
}
