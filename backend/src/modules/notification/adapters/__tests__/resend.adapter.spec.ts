import { ResendEmailAdapter } from '../resend.adapter';
import { NotificationConfig } from '../../../../config/notification.config';

describe('ResendEmailAdapter', () => {
  const baseConfig: NotificationConfig = {
    nodeEnv: 'test',
    provider: 'resend',
    resend: {
      apiKey: 'test-key',
      fromAddress: 'noreply@example.com',
    },
  };

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('send()', () => {
    it('정상 응답 시 messageId/provider 반환', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-123' }),
      } as Response);

      const adapter = new ResendEmailAdapter(baseConfig);
      const result = await adapter.send({
        to: 'user@example.com',
        subject: 'Hi',
        html: '<p>Hi</p>',
      });

      expect(result).toEqual({ messageId: 'msg-123', provider: 'resend' });
    });

    it('Resend API 호출 시 올바른 URL/헤더/바디', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-1' }),
      } as Response);

      const adapter = new ResendEmailAdapter(baseConfig);
      await adapter.send({
        to: 'user@example.com',
        subject: '제목',
        html: '<p>본문</p>',
        text: '본문',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
        }),
      );

      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body).toEqual({
        from: 'noreply@example.com',
        to: 'user@example.com',
        subject: '제목',
        html: '<p>본문</p>',
        text: '본문',
      });
    });

    it('id가 누락되면 messageId는 빈 문자열', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const adapter = new ResendEmailAdapter(baseConfig);
      const result = await adapter.send({ to: 'a@b.com', subject: 's', html: 'h' });

      expect(result.messageId).toBe('');
    });

    it('apiKey 미설정 시 send() 호출하면 에러', async () => {
      const adapter = new ResendEmailAdapter({
        ...baseConfig,
        resend: { ...baseConfig.resend, apiKey: '' },
      });

      await expect(
        adapter.send({ to: 'a@b.com', subject: 's', html: 'h' }),
      ).rejects.toThrow('RESEND_API_KEY is not configured.');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('non-2xx 응답 시 status/body 포함된 에러', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Invalid recipient',
      } as Response);

      const adapter = new ResendEmailAdapter(baseConfig);
      await expect(
        adapter.send({ to: 'bad@example.com', subject: 's', html: 'h' }),
      ).rejects.toThrow('Resend API error: 422 Invalid recipient');
    });

    it('네트워크 오류는 그대로 throw', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNRESET'));

      const adapter = new ResendEmailAdapter(baseConfig);
      await expect(
        adapter.send({ to: 'a@b.com', subject: 's', html: 'h' }),
      ).rejects.toThrow('ECONNRESET');
    });
  });
});
