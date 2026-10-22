import { BadGatewayException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { createHmac } from 'crypto';
import { createNotificationConfig, NotificationConfig } from '../../config/notification.config';
import { SolapiTemplateAdminService } from './solapi-template-admin.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SolapiTemplateAdminService', () => {
  let config: NotificationConfig;
  let service: SolapiTemplateAdminService;
  const source = {
    templateId: 'TP-source', channelId: 'CH-shop', channelGroupId: null,
    content: '#{customerName} 주문 안내', status: 'APPROVED', name: '주문 안내', categoryCode: '003001',
    buttons: [{ buttonType: 'WL', buttonName: '주문 확인', linkMo: 'https://shop.example/orders' }],
    quickReplies: [{ name: '고객센터', linkMo: 'https://shop.example/help' }],
    emphasizeType: 'TEXT', emphasizeTitle: '주문 완료', emphasizeSubtitle: '감사합니다',
    securityFlag: true, accountId: 'must-not-return', comments: ['private'],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    config = createNotificationConfig({
      NODE_ENV: 'test', MESSAGE_KAKAO_CHANNEL_ID: 'CH-shop',
      MESSAGE_SOLAPI_API_KEY: 'test-api-key', MESSAGE_SOLAPI_API_SECRET: 'test-api-secret',
    });
    service = new SolapiTemplateAdminService(config);
    mockedAxios.request.mockResolvedValue({ data: source });
  });

  it('reads only summary fields with HMAC auth and bounded requests', async () => {
    await expect(service.read('TP-source')).resolves.toEqual({
      templateId: source.templateId, content: source.content, status: source.status,
    });
    const request = mockedAxios.request.mock.calls[0][0];
    expect(request).toMatchObject({
      method: 'GET', url: 'https://api.solapi.com/kakao/v2/templates/TP-source', timeout: 10000, maxRedirects: 0,
    });
    const authorization = String(request.headers?.Authorization);
    const [, date, salt, signature] = authorization.match(/date=([^,]+), salt=([^,]+), signature=(.+)$/)!;
    expect(authorization).toContain('HMAC-SHA256 apiKey=test-api-key,');
    expect(signature).toBe(createHmac('sha256', 'test-api-secret').update(date + salt).digest('hex'));
  });

  it('creates a revision preserving presentation fields without changing the source', async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: source }).mockResolvedValueOnce({ data: {
      templateId: 'TP-revision', content: '변경된 안내', status: 'PENDING',
    } });
    await expect(service.createRevision('TP-source', '변경된 안내')).resolves.toEqual({
      templateId: 'TP-revision', content: '변경된 안내', status: 'PENDING',
    });
    expect(mockedAxios.request.mock.calls[1][0]).toMatchObject({
      method: 'POST', url: 'https://api.solapi.com/kakao/v2/templates', data: {
        channelId: source.channelId, name: source.name, categoryCode: source.categoryCode,
        content: '변경된 안내', buttons: source.buttons, quickReplies: source.quickReplies,
        emphasizeType: 'TEXT', emphasizeTitle: '주문 완료', emphasizeSubtitle: '감사합니다', securityFlag: true,
      },
    });
    expect(mockedAxios.request.mock.calls[1][0].data).not.toHaveProperty('templateId');
    expect(mockedAxios.request.mock.calls[1][0].data).not.toHaveProperty('accountId');
    expect(source.content).toBe('#{customerName} 주문 안내');
  });

  it('checks ownership before requesting inspection', async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: { ...source, status: 'PENDING' } })
      .mockResolvedValueOnce({ data: { ...source, status: 'INSPECTING' } });
    await expect(service.requestInspection('TP-source')).resolves.toMatchObject({ status: 'INSPECTING' });
    expect(mockedAxios.request.mock.calls[1][0]).toMatchObject({
      method: 'PUT', url: 'https://api.solapi.com/kakao/v2/templates/TP-source/inspection', data: {},
    });
  });

  it.each([
    { content: '#{unsupported}' },
    { buttons: [{ linkMo: 'https://shop.example/#{unsupported}' }] },
    { quickReplies: [{ linkMo: 'https://shop.example/#{unsupported}' }] },
    { item: { list: [{ description: '#{unsupported}' }] } },
  ])('rejects unsupported variables in provider presentation: %o', async (override) => {
    mockedAxios.request.mockResolvedValue({ data: { ...source, ...override } });
    await expect(service.read('TP-source', ['customerName'])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts supported variables and ignores non-rendered metadata', async () => {
    mockedAxios.request.mockResolvedValue({ data: { ...source, comments: ['#{internalComment}'] } });
    await expect(service.read('TP-source', ['customerName'])).resolves.toMatchObject({ templateId: 'TP-source' });
  });

  it('validates revision variables using the new body and retained buttons', async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: { ...source, content: '#{obsoleteVariable}' } })
      .mockResolvedValueOnce({ data: { ...source, templateId: 'TP-new', content: '#{customerName}', status: 'PENDING' } });
    await expect(service.createRevision('TP-source', '#{customerName}', ['customerName'])).resolves.toMatchObject({ templateId: 'TP-new' });

    mockedAxios.request.mockClear();
    mockedAxios.request.mockResolvedValue({ data: { ...source, buttons: [{ linkMo: 'https://shop.example/#{unsupported}' }] } });
    await expect(service.createRevision('TP-source', '#{customerName}', ['customerName'])).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported new-body variables before creating a revision', async () => {
    await expect(service.createRevision('TP-source', '#{unsupported}', ['customerName'])).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it.each([
    { channelId: 'CH-other' }, { channelGroupId: 'group' }, { isDeleted: true }, { templateId: 'TP-other' },
  ])('rejects templates outside the configured channel: %o', async (override) => {
    mockedAxios.request.mockResolvedValue({ data: { ...source, ...override } });
    await expect(service.createRevision('TP-source', '안내')).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it('does not request inspection for an approved template', async () => {
    await expect(service.requestInspection('TP-source')).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it.each(['', '../secret', 'TP?id=bad'])('rejects invalid template IDs %s before network access', async (id) => {
    await expect(service.read(id)).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });

  it.each(['', ' ', 'x'.repeat(1001)])('rejects empty or oversized content', async (content) => {
    await expect(service.createRevision('TP-source', content)).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { ...source, status: 'UNKNOWN' }, { ...source, content: 5 }])('rejects malformed upstream response', async (data) => {
    mockedAxios.request.mockResolvedValue({ data });
    await expect(service.read('TP-source')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('rejects incomplete source metadata before creating a template', async () => {
    mockedAxios.request.mockResolvedValue({ data: { ...source, categoryCode: null } });
    await expect(service.createRevision('TP-source', '안내')).rejects.toBeInstanceOf(BadGatewayException);
    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
  });

  it('does not expose upstream errors or retry uncertain writes', async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: source }).mockRejectedValueOnce(new Error('test-api-secret'));
    await expect(service.createRevision('TP-source', '안내')).rejects.toThrow('SOLAPI 템플릿 요청에 실패했습니다.');
    expect(mockedAxios.request).toHaveBeenCalledTimes(2);
  });

  it('rejects missing credentials without network access', async () => {
    config.message.solapi.apiSecret = '';
    await expect(service.read('TP-source')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });
});
