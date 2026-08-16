export type TransactionalMessageChannel = 'kakao_alimtalk' | 'sms' | 'lms';

export type MessageTemplateKey =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'SHIPPING_STARTED'
  | 'SHIPPING_DELIVERED';

export interface TransactionalMessage {
  idempotencyKey: string;
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

export class AmbiguousMessageDeliveryError extends Error {
  constructor(message: string, public readonly requestId: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AmbiguousMessageDeliveryError';
  }
}

/** A different worker owns a fresh local delivery reservation. Retry after its outcome settles. */
export class MessageDeliveryInProgressError extends Error {
  constructor(public readonly requestId: string) {
    super(`Message delivery is already processing for ${requestId}`);
    this.name = 'MessageDeliveryInProgressError';
  }
}

export interface MessageProvider {
  send(message: TransactionalMessage): Promise<MessageSendResult>;
}
