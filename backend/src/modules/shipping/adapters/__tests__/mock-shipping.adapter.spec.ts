import { MockShippingAdapter } from '../mock-shipping.adapter';

describe('MockShippingAdapter', () => {
  let adapter: MockShippingAdapter;

  beforeEach(() => {
    adapter = new MockShippingAdapter();
  });

  describe('registerTrackingNumber()', () => {
    it('Mock은 no-op로 성공', async () => {
      await expect(adapter.registerTrackingNumber('order-1', 'TRACK-1')).resolves.toBeUndefined();
    });
  });

  describe('getTrackingStatus()', () => {
    it('전달받은 trackingNumber 그대로 반환', async () => {
      const result = await adapter.getTrackingStatus('MOCK-123', 'mock');

      expect(result.trackingNumber).toBe('MOCK-123');
    });

    it('status는 in_transit으로 시뮬레이션', async () => {
      const result = await adapter.getTrackingStatus('MOCK-124', 'mock');

      expect(result.status).toBe('in_transit');
    });

    it('shipped + in_transit 두 단계의 steps 시뮬레이션', async () => {
      const result = await adapter.getTrackingStatus('MOCK-125', 'mock');

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].status).toBe('shipped');
      expect(result.steps[0].description).toBe('발송 완료');
      expect(result.steps[1].status).toBe('in_transit');
      expect(result.steps[1].description).toBe('배송 중');
    });

    it('각 step의 timestamp는 ISO 8601 문자열', async () => {
      const result = await adapter.getTrackingStatus('MOCK-126', 'mock');

      for (const step of result.steps) {
        expect(typeof step.timestamp).toBe('string');
        expect(() => new Date(step.timestamp).toISOString()).not.toThrow();
      }
    });

    it('carrier 인자에 무관하게 동일 시뮬레이션 반환', async () => {
      const cj = await adapter.getTrackingStatus('TRK', 'cj');
      const hanjin = await adapter.getTrackingStatus('TRK', 'hanjin');

      expect(cj.trackingNumber).toBe(hanjin.trackingNumber);
      expect(cj.status).toBe(hanjin.status);
      expect(cj.steps).toHaveLength(hanjin.steps.length);
    });
  });
});
