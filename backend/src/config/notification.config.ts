import { Provider } from '@nestjs/common';

export const NOTIFICATION_CONFIG = Symbol('NOTIFICATION_CONFIG');

export type NotificationProviderName = 'mock' | 'resend' | 'ses';

export interface NotificationConfig {
  nodeEnv: string;
  provider: NotificationProviderName;
  resend: {
    apiKey: string;
    fromAddress: string;
  };
}

function isNotificationProviderName(value: string): value is NotificationProviderName {
  return value === 'mock' || value === 'resend' || value === 'ses';
}

export function createNotificationConfig(
  env: NodeJS.ProcessEnv = process.env,
): NotificationConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const provider = (env.NOTIFICATION_PROVIDER ?? 'mock').trim().toLowerCase();

  if (nodeEnv === 'production' && (provider === 'mock' || !env.NOTIFICATION_PROVIDER)) {
    throw new Error(
      'Mock notification provider는 프로덕션에서 사용할 수 없습니다. NOTIFICATION_PROVIDER 환경변수를 설정하세요.',
    );
  }

  if (!isNotificationProviderName(provider)) {
    throw new Error(`Unknown NOTIFICATION_PROVIDER: ${provider}`);
  }

  return {
    nodeEnv,
    provider,
    resend: {
      apiKey: env.RESEND_API_KEY ?? '',
      fromAddress: env.EMAIL_FROM ?? 'no-reply@okhwadang.com',
    },
  };
}

export const notificationConfigProvider: Provider = {
  provide: NOTIFICATION_CONFIG,
  useFactory: () => createNotificationConfig(),
};
