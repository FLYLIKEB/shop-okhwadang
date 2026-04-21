import { createNotificationConfig } from '../notification.config';

describe('createNotificationConfig', () => {
  it('production에서 mock 알림 provider를 차단한다', () => {
    expect(() =>
      createNotificationConfig({
        NODE_ENV: 'production',
        NOTIFICATION_PROVIDER: 'mock',
      }),
    ).toThrow('Mock notification provider는 프로덕션에서 사용할 수 없습니다');
  });

  it('development에서는 기본 mock provider를 허용한다', () => {
    const config = createNotificationConfig({
      NODE_ENV: 'development',
    });

    expect(config.provider).toBe('mock');
  });

  it('알 수 없는 provider는 에러를 던진다', () => {
    expect(() =>
      createNotificationConfig({
        NODE_ENV: 'development',
        NOTIFICATION_PROVIDER: 'legacy',
      }),
    ).toThrow('Unknown NOTIFICATION_PROVIDER: legacy');
  });
});
