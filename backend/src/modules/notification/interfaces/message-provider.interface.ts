export type TransactionalMessageChannel = 'kakao_alimtalk' | 'sms' | 'lms';

export type MessageTemplateKey =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'SHIPPING_STARTED'
  | 'SHIPPING_DELIVERED';

export interface TransactionalMessage {
  to: string;
  templateKey: MessageTemplateKey;
  templateId: string;
  variables: Record<string, string>;
  fallbackText: string;
  smsFallbackEnabled: boolean;
}

export interface MessageSendResult {
  provider: string;
  providerMessageId: string;
  channel: TransactionalMessageChannel;
  status: 'sent' | 'failed';
  errorMessage?: string;
}

export interface MessageProvider {
  send(message: TransactionalMessage): Promise<MessageSendResult>;
}
