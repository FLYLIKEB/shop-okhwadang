import { BadRequestException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { CjShippingAdapter } from '../cj-shipping.adapter';

jest.mock('axios');

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe('CjShippingAdapter', () => {
  let adapter: CjShippingAdapter;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    adapter = new CjShippingAdapter();
    jest.clearAllMocks();
    process.env.CJ_TRACKING_API_URL = 'https://example.com/tracking';
    process.env.CJ_TRACKING_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('registerTrackingNumber()', () => {
    it('CJ는 별도 등록 절차 없이 no-op로 성공', async () => {
      await expect(adapter.registerTrackingNumber('order-1', 'TRACK-123')).resolves.toBeUndefined();
      expect(mockedAxiosGet).not.toHaveBeenCalled();
    });
  });

  describe('getTrackingStatus()', () => {
    it('정상 응답 시 trackingNumber/status/steps 매핑', async () => {
      mockedAxiosGet.mockResolvedValue({
        data: {
          status: 'in transit',
          estimatedDelivery: '2026-04-30',
          steps: [
            { status: 'shipped', description: '출고', timestamp: '2026-04-25T10:00:00Z' },
            { status: 'in_transit', description: '이동중', timestamp: '2026-04-26T10:00:00Z' },
          ],
        },
      });

      const result = await adapter.getTrackingStatus('TRK-1', 'cj');

      expect(result.trackingNumber).toBe('TRK-1');
      expect(result.status).toBe('in_transit');
      expect(result.estimatedDelivery).toBe('2026-04-30');
      expect(result.steps).toHaveLength(2);
      expect(mockedAxiosGet).toHaveBeenCalledWith(
        'https://example.com/tracking',
        expect.objectContaining({
          params: { trackingNumber: 'TRK-1' },
          headers: { Authorization: 'Bearer test-api-key' },
          timeout: 5000,
        }),
      );
    });

    it('status에 "deliver" 포함 시 delivered로 매핑', async () => {
      mockedAxiosGet.mockResolvedValue({
        data: { status: 'Delivered', steps: [] },
      });

      const result = await adapter.getTrackingStatus('TRK-2', 'cj');

      expect(result.status).toBe('delivered');
    });

    it('status에 "move" 포함 시 in_transit로 매핑', async () => {
      mockedAxiosGet.mockResolvedValue({
        data: { status: 'On the move', steps: [] },
      });

      const result = await adapter.getTrackingStatus('TRK-3', 'cj');

      expect(result.status).toBe('in_transit');
    });

    it('알 수 없는 status는 shipped로 fallback', async () => {
      mockedAxiosGet.mockResolvedValue({
        data: { status: 'unknown-state', steps: [] },
      });

      const result = await adapter.getTrackingStatus('TRK-4', 'cj');

      expect(result.status).toBe('shipped');
    });

    it('steps의 누락 필드는 기본값으로 채움', async () => {
      mockedAxiosGet.mockResolvedValue({
        data: {
          status: 'shipped',
          steps: [{}],
        },
      });

      const result = await adapter.getTrackingStatus('TRK-5', 'cj');

      expect(result.steps[0].status).toBe('in_transit');
      expect(result.steps[0].description).toBe('');
      expect(typeof result.steps[0].timestamp).toBe('string');
    });

    it('steps 누락 시 빈 배열 반환', async () => {
      mockedAxiosGet.mockResolvedValue({
        data: { status: 'shipped' },
      });

      const result = await adapter.getTrackingStatus('TRK-6', 'cj');

      expect(result.steps).toEqual([]);
    });

    it('환경변수 CJ_TRACKING_API_URL 누락 시 BadRequestException', async () => {
      delete process.env.CJ_TRACKING_API_URL;

      await expect(adapter.getTrackingStatus('TRK-7', 'cj')).rejects.toThrow(BadRequestException);
      await expect(adapter.getTrackingStatus('TRK-7', 'cj')).rejects.toThrow(
        'CJ 택배 API 연동 설정이 누락되었습니다.',
      );
      expect(mockedAxiosGet).not.toHaveBeenCalled();
    });

    it('환경변수 CJ_TRACKING_API_KEY 누락 시 BadRequestException', async () => {
      delete process.env.CJ_TRACKING_API_KEY;

      await expect(adapter.getTrackingStatus('TRK-8', 'cj')).rejects.toThrow(BadRequestException);
    });

    it('429 응답 시 요청 한도 초과 메시지로 BadRequestException', async () => {
      const err = new AxiosError('rate limited');
      err.response = { status: 429 } as AxiosError['response'];
      mockedAxiosGet.mockRejectedValue(err);

      await expect(adapter.getTrackingStatus('TRK-9', 'cj')).rejects.toThrow(
        'CJ API 요청 한도를 초과했습니다.',
      );
    });

    it('네트워크 오류 시 일반 실패 메시지로 BadRequestException', async () => {
      mockedAxiosGet.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(adapter.getTrackingStatus('TRK-10', 'cj')).rejects.toThrow(BadRequestException);
      await expect(adapter.getTrackingStatus('TRK-10', 'cj')).rejects.toThrow(
        'CJ 배송 추적 조회에 실패했습니다.',
      );
    });

    it('429 외 AxiosError 응답 코드는 일반 실패 메시지로 처리', async () => {
      const err = new AxiosError('server error');
      err.response = { status: 500 } as AxiosError['response'];
      mockedAxiosGet.mockRejectedValue(err);

      await expect(adapter.getTrackingStatus('TRK-11', 'cj')).rejects.toThrow(
        'CJ 배송 추적 조회에 실패했습니다.',
      );
    });
  });
});
