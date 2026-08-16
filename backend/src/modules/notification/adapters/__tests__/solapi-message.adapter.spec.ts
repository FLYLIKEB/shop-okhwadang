import axios from 'axios';
import { SolapiMessageAdapter } from '../solapi-message.adapter';
import { NotificationConfig } from '../../../../config/notification.config';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SolapiMessageAdapter', () => {
  const config: NotificationConfig = {
    nodeEnv: 'test',
    provider: 'mock',
    resend: { apiKey: '', fromAddress: 'no-reply@okhwadang.com' },
    message: {
      provider: 'solapi',
      senderPhone: '021234567',
      kakaoChannelId: 'pf-id',
      smsFallbackEnabled: true,
      phoneHashSalt: 'test',
      templates: {
        ORDER_CREATED: 'tpl-order',
        PAYMENT_CONFIRMED: 'tpl-payment',
        SHIPPING_STARTED: 'tpl-shipping-started',
        SHIPPING_DELIVERED: 'tpl-shipping-delivered',
        ORDER_CANCELLED: 'tpl-order-cancelled',
      },
      solapi: {
        apiKey: 'api-key',
        apiSecret: 'api-secret',
        apiBaseUrl: 'https://api.solapi.com',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ data: { messageId: 'solapi-1' } });
  });

  it('Solapi 알림톡 payload에 템플릿, 변수, 대체문자 옵션을 포함한다', async () => {
    const adapter = new SolapiMessageAdapter(config);

    const result = await adapter.send({
      idempotencyKey: 'effect-1',
      to: '01012345678',
      templateKey: 'ORDER_CREATED',
      templateId: 'tpl-order',
      variables: { customerName: '홍길동', orderNumber: 'ORD-1' },
      fallbackText: '[옥화당] 주문 접수',
      smsFallbackEnabled: true,
    });

    expect(result).toEqual({
      provider: 'solapi',
      providerMessageId: 'solapi-1',
      channel: 'kakao_alimtalk',
      status: 'sent',
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.solapi.com/messages/v4/send',
      {
        message: expect.objectContaining({
          to: '01012345678',
          from: '021234567',
          text: '[옥화당] 주문 접수',
          customFields: { requestId: 'effect-1' },
          kakaoOptions: {
            pfId: 'pf-id',
            templateId: 'tpl-order',
            variables: { customerName: '홍길동', orderNumber: 'ORD-1' },
            disableSms: false,
          },
        }),
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('HMAC-SHA256 apiKey=api-key'),
        }),
      }),
    );
  });
});
