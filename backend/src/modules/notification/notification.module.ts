import { Global, Module } from '@nestjs/common';
import { NotificationService, EMAIL_PROVIDER_TOKEN } from './notification.service';
import { MockEmailAdapter } from './adapters/mock.adapter';
import { ResendEmailAdapter } from './adapters/resend.adapter';
import { SesEmailAdapter } from './adapters/ses.adapter';
import {
  NotificationConfig,
  NOTIFICATION_CONFIG,
  notificationConfigProvider,
} from '../../config/notification.config';

export function resolveNotificationProvider(config: NotificationConfig): string {
  return config.provider;
}

@Global()
@Module({
  providers: [
    notificationConfigProvider,
    MockEmailAdapter,
    ResendEmailAdapter,
    SesEmailAdapter,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useFactory: (
        config: NotificationConfig,
        mock: MockEmailAdapter,
        resend: ResendEmailAdapter,
        ses: SesEmailAdapter,
      ) => {
        const name = resolveNotificationProvider(config);
        switch (name) {
          case 'resend':
            return resend;
          case 'ses':
            return ses;
          case 'mock':
            return mock;
          default:
            throw new Error(`Unknown NOTIFICATION_PROVIDER: ${name}`);
        }
      },
      inject: [NOTIFICATION_CONFIG, MockEmailAdapter, ResendEmailAdapter, SesEmailAdapter],
    },
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
