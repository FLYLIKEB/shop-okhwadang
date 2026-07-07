import { Provider } from '@nestjs/common';
import { MessageTemplateKey } from '../modules/notification/interfaces/message-provider.interface';

export const NOTIFICATION_CONFIG = Symbol('NOTIFICATION_CONFIG');

export type NotificationProviderName = 'mock' | 'resend' | 'ses';
export type MessageProviderName = 'mock' | 'solapi';

export interface NotificationConfig {
  nodeEnv: string;
  provider: NotificationProviderName;
  resend: {
    apiKey: string;
    fromAddress: string;
  };
  message: {
    provider: MessageProviderName;
    senderPhone: string;
    kakaoChannelId: string;
    smsFallbackEnabled: boolean;
    phoneHashSalt: string;
    templates: Record<MessageTemplateKey, string>;
    solapi: {
      apiKey: string;
      apiSecret: string;
      apiBaseUrl: string;
    };
  };
}

function isNotificationProviderName(value: string): value is NotificationProviderName {
  return value === 'mock' || value === 'resend' || value === 'ses';
}

function isMessageProviderName(value: string): value is MessageProviderName {
  return value === 'mock' || value === 'solapi';
}

function requireMessageEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} 환경변수가 필요합니다.`);
  }
  return value;
}

export function createNotificationConfig(env: NodeJS.ProcessEnv = process.env): NotificationConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const provider = (env.NOTIFICATION_PROVIDER ?? 'mock').trim().toLowerCase();
  const messageProvider = (env.MESSAGE_PROVIDER ?? 'mock').trim().toLowerCase();

  if (nodeEnv === 'production' && (provider === 'mock' || !env.NOTIFICATION_PROVIDER)) {
    throw new Error(
      'Mock notification provider는 프로덕션에서 사용할 수 없습니다. NOTIFICATION_PROVIDER 환경변수를 설정하세요.',
    );
  }

  if (!isNotificationProviderName(provider)) {
    throw new Error(`Unknown NOTIFICATION_PROVIDER: ${provider}`);
  }

  if (!isMessageProviderName(messageProvider)) {
    throw new Error(`Unknown MESSAGE_PROVIDER: ${messageProvider}`);
  }

  const hasMessageTemplate = [
    env.MESSAGE_TEMPLATE_ORDER_CREATED,
    env.MESSAGE_TEMPLATE_PAYMENT_CONFIRMED,
    env.MESSAGE_TEMPLATE_SHIPPING_STARTED,
    env.MESSAGE_TEMPLATE_SHIPPING_DELIVERED,
    env.MESSAGE_TEMPLATE_ORDER_CANCELLED,
  ].some((value) => Boolean(value?.trim()));

  if (nodeEnv === 'production' && messageProvider === 'mock' && hasMessageTemplate) {
    throw new Error(
      'Mock message provider는 프로덕션 템플릿이 설정된 상태에서 사용할 수 없습니다. MESSAGE_PROVIDER=solapi 를 설정하거나 메시지 템플릿 값을 비우세요.',
    );
  }

  if (messageProvider === 'solapi') {
    for (const key of [
      'MESSAGE_SENDER_PHONE',
      'MESSAGE_KAKAO_CHANNEL_ID',
      'MESSAGE_SOLAPI_API_KEY',
      'MESSAGE_SOLAPI_API_SECRET',
      'MESSAGE_TEMPLATE_ORDER_CREATED',
      'MESSAGE_TEMPLATE_PAYMENT_CONFIRMED',
      'MESSAGE_TEMPLATE_SHIPPING_STARTED',
      'MESSAGE_TEMPLATE_SHIPPING_DELIVERED',
      'MESSAGE_TEMPLATE_ORDER_CANCELLED',
    ]) {
      requireMessageEnv(env, key);
    }
  }

  return {
    nodeEnv,
    provider,
    resend: {
      apiKey: env.RESEND_API_KEY ?? '',
      fromAddress: env.EMAIL_FROM ?? 'no-reply@okhwadang.com',
    },
    message: {
      provider: messageProvider,
      senderPhone: env.MESSAGE_SENDER_PHONE ?? '',
      kakaoChannelId: env.MESSAGE_KAKAO_CHANNEL_ID ?? '',
      smsFallbackEnabled:
        (env.MESSAGE_ENABLE_SMS_FALLBACK ?? 'true').trim().toLowerCase() !== 'false',
      phoneHashSalt:
        env.MESSAGE_PHONE_HASH_SALT ?? env.JWT_SECRET ?? 'okhwadang-local-message-salt',
      templates: {
        ORDER_CREATED: env.MESSAGE_TEMPLATE_ORDER_CREATED ?? '',
        PAYMENT_CONFIRMED: env.MESSAGE_TEMPLATE_PAYMENT_CONFIRMED ?? '',
        SHIPPING_STARTED: env.MESSAGE_TEMPLATE_SHIPPING_STARTED ?? '',
        SHIPPING_DELIVERED: env.MESSAGE_TEMPLATE_SHIPPING_DELIVERED ?? '',
        ORDER_CANCELLED: env.MESSAGE_TEMPLATE_ORDER_CANCELLED ?? '',
      },
      solapi: {
        apiKey: env.MESSAGE_SOLAPI_API_KEY ?? '',
        apiSecret: env.MESSAGE_SOLAPI_API_SECRET ?? '',
        apiBaseUrl: env.MESSAGE_SOLAPI_API_BASE_URL ?? 'https://api.solapi.com',
      },
    },
  };
}

export const notificationConfigProvider: Provider = {
  provide: NOTIFICATION_CONFIG,
  useFactory: () => createNotificationConfig(),
};
