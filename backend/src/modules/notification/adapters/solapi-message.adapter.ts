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

interface SolapiSingleSendResponse {
  groupId?: string;
  messageId?: string;
  to?: string;
  from?: string;
  statusCode?: string;
  statusMessage?: string;
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
      response = await axios.post<SolapiSingleSendResponse>(
        `${this.config.message.solapi.apiBaseUrl}/messages/v4/send`,
        { message: this.buildPayload(message) },
        { headers: { Authorization: this.buildAuthorizationHeader(), 'Content-Type': 'application/json' } },
      );
    } catch (error) {
      throw new AmbiguousMessageDeliveryError('SOLAPI delivery outcome is unknown', message.idempotencyKey, error);
    }
    const providerMessageId = response.data.messageId ?? response.data.groupId;
    if (response.data.statusCode && !response.data.statusCode.startsWith('2')) return { provider: 'solapi', providerMessageId: providerMessageId ?? '', channel: 'kakao_alimtalk', status: 'failed', errorMessage: response.data.statusMessage ?? `SOLAPI rejected message (${response.data.statusCode})` };
    if (!providerMessageId) throw new AmbiguousMessageDeliveryError('SOLAPI response has no message identifier', message.idempotencyKey);
    return { provider: 'solapi', providerMessageId, channel: 'kakao_alimtalk', status: 'sent' };
  }

  private buildPayload(message: TransactionalMessage): Record<string, unknown> {
    return {
      to: message.to,
      from: this.config.message.senderPhone,
      text: message.fallbackText,
      kakaoOptions: {
        pfId: this.config.message.kakaoChannelId,
        templateId: message.templateId,
        variables: message.variables,
        disableSms: !message.smsFallbackEnabled,
      },
      autoTypeDetect: true,
      customFields: { requestId: message.idempotencyKey },
    };
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
