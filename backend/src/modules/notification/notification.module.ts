import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService, EMAIL_PROVIDER_TOKEN } from './notification.service';
import { MessageNotificationService, MESSAGE_PROVIDER_TOKEN } from './message-notification.service';
import { NotificationDispatchHelper } from './notification-dispatch.helper';
import { MockEmailAdapter } from './adapters/mock.adapter';
import { ResendEmailAdapter } from './adapters/resend.adapter';
import { SesEmailAdapter } from './adapters/ses.adapter';
import { MockMessageAdapter } from './adapters/mock-message.adapter';
import { SolapiMessageAdapter } from './adapters/solapi-message.adapter';
import { NotificationLog } from './entities/notification-log.entity';
import {
  NotificationConfig,
  NOTIFICATION_CONFIG,
  notificationConfigProvider,
} from '../../config/notification.config';

export function resolveNotificationProvider(config: NotificationConfig): string {
  return config.provider;
}

export function resolveMessageProvider(config: NotificationConfig): string {
  return config.message.provider;
}

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([NotificationLog])],
  providers: [
    notificationConfigProvider,
    MockEmailAdapter,
    ResendEmailAdapter,
    SesEmailAdapter,
    MockMessageAdapter,
    SolapiMessageAdapter,
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
    {
      provide: MESSAGE_PROVIDER_TOKEN,
      useFactory: (
        config: NotificationConfig,
        mock: MockMessageAdapter,
        solapi: SolapiMessageAdapter,
      ) => {
        const name = resolveMessageProvider(config);
        switch (name) {
          case 'solapi':
            return solapi;
          case 'mock':
            return mock;
          default:
            throw new Error(`Unknown MESSAGE_PROVIDER: ${name}`);
        }
      },
      inject: [NOTIFICATION_CONFIG, MockMessageAdapter, SolapiMessageAdapter],
    },
    NotificationService,
    MessageNotificationService,
    NotificationDispatchHelper,
  ],
  exports: [NotificationService, MessageNotificationService, NotificationDispatchHelper],
})
export class NotificationModule {}
