import { Global, Module } from '@nestjs/common';
import { NotificationService, EMAIL_PROVIDER_TOKEN } from './notification.service';
import { MockEmailAdapter } from './adapters/mock.adapter';
import { ResendEmailAdapter } from './adapters/resend.adapter';
import { SesEmailAdapter } from './adapters/ses.adapter';

export function resolveNotificationProvider(): string {
  const provider = process.env.NOTIFICATION_PROVIDER ?? 'mock';
  if (
    process.env.NODE_ENV === 'production' &&
    (provider === 'mock' || !process.env.NOTIFICATION_PROVIDER)
  ) {
    throw new Error(
      'Mock notification provider는 프로덕션에서 사용할 수 없습니다. NOTIFICATION_PROVIDER 환경변수를 설정하세요.',
    );
  }
  return provider;
}

@Global()
@Module({
  providers: [
    MockEmailAdapter,
    ResendEmailAdapter,
    SesEmailAdapter,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useFactory: (
        mock: MockEmailAdapter,
        resend: ResendEmailAdapter,
        ses: SesEmailAdapter,
      ) => {
        const name = resolveNotificationProvider();
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
      inject: [MockEmailAdapter, ResendEmailAdapter, SesEmailAdapter],
    },
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
