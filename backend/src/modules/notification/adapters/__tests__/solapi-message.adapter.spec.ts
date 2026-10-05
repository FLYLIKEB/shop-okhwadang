import axios from 'axios';
import { SolapiMessageAdapter } from '../solapi-message.adapter';
import { NotificationConfig } from '../../../../config/notification.config';
import { AmbiguousMessageDeliveryError } from '../../interfaces/message-provider.interface';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SolapiMessageAdapter', () => {
  const config: NotificationConfig = {
    nodeEnv: 'test',
    provider: 'mock',
    resend: { apiKey: '', fromAddress: 'no-reply@okhwadang.com' },
    message: {
      provider: 'solapi',
      channel: 'alimtalk',
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
    mockedAxios.post.mockResolvedValue({ data: {
      messageList: [{ messageId: 'solapi-1', statusCode: '2000' }],
      failedMessageList: [],
    } });
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
      'https://api.solapi.com/messages/v4/send-many/detail',
      {
        messages: [expect.objectContaining({
          to: '01012345678',
          from: '021234567',
          text: '[옥화당] 주문 접수',
          customFields: { requestId: 'effect-1' },
          kakaoOptions: {
            pfId: 'pf-id',
            templateId: 'tpl-order',
            variables: { '#{customerName}': '홍길동', '#{orderNumber}': 'ORD-1' },
            disableSms: false,
          },
        })],
        showMessageList: true,
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('HMAC-SHA256 apiKey=api-key'),
        }),
      }),
    );
  });

  it('문자 전용 모드는 카카오 옵션 없이 SMS 또는 LMS로 접수한다', async () => {
    const adapter = new SolapiMessageAdapter({
      ...config,
      message: { ...config.message, channel: 'sms', kakaoChannelId: '' },
    });
    const message = {
      idempotencyKey: 'effect-sms',
      to: '01012345678',
      templateKey: 'ORDER_CREATED' as const,
      templateId: '',
      variables: {},
      fallbackText: '[옥화당] 주문 접수',
      smsFallbackEnabled: false,
    };

    expect(await adapter.send(message)).toEqual({
      provider: 'solapi', providerMessageId: 'solapi-1', channel: 'sms', status: 'sent',
    });
    expect(mockedAxios.post.mock.calls[0][1]).toEqual({ messages: [{
      to: '01012345678', from: '021234567', text: '[옥화당] 주문 접수',
      autoTypeDetect: true, customFields: { requestId: 'effect-sms' },
    }], showMessageList: true });

    mockedAxios.post.mockResolvedValue({ data: {
      messageList: [{ messageId: 'solapi-2', statusCode: '2000', type: 'LMS' }],
      failedMessageList: [],
    } });
    expect(await adapter.send({ ...message, fallbackText: '긴 문자'.repeat(30) })).toEqual({
      provider: 'solapi', providerMessageId: 'solapi-2', channel: 'lms', status: 'sent',
    });
  });

  it('2000 외 상태는 접수 성공으로 처리하지 않는다', async () => {
    mockedAxios.post.mockResolvedValue({ data: {
      messageList: [],
      failedMessageList: [{ messageId: 'solapi-3', statusCode: '3040', statusMessage: '등록되지 않은 발신번호' }],
    } });
    const adapter = new SolapiMessageAdapter(config);
    const result = await adapter.send({
      idempotencyKey: 'effect-3', to: '01012345678', templateKey: 'ORDER_CREATED',
      templateId: 'tpl-order', variables: {}, fallbackText: '주문 접수', smsFallbackEnabled: false,
    });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe('등록되지 않은 발신번호');
  });

  it('접수 목록이 없거나 식별할 수 없으면 결과를 불명확하게 보존한다', async () => {
    const adapter = new SolapiMessageAdapter(config);
    const message = {
      idempotencyKey: 'effect-4', to: '01012345678', templateKey: 'ORDER_CREATED' as const,
      templateId: 'tpl-order', variables: {}, fallbackText: '주문 접수', smsFallbackEnabled: false,
    };
    mockedAxios.post.mockResolvedValueOnce({ data: { messageList: [], failedMessageList: [] } });
    await expect(adapter.send(message)).rejects.toBeInstanceOf(AmbiguousMessageDeliveryError);

    mockedAxios.post.mockResolvedValueOnce({ data: {
      messageList: [{ statusCode: '2000' }], failedMessageList: [],
    } });
    await expect(adapter.send(message)).rejects.toBeInstanceOf(AmbiguousMessageDeliveryError);
  });
});
