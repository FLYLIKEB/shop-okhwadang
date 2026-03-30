import { MockPaymentAdapter, MOCK_TEST_SIGNATURE } from '../adapters/mock.adapter';

describe('MockPaymentAdapter', () => {
  let adapter: MockPaymentAdapter;

  beforeEach(() => {
    adapter = new MockPaymentAdapter();
  });

  describe('verifyWebhook', () => {
    it('올바른 테스트 시그니처 → true', () => {
      expect(adapter.verifyWebhook({}, MOCK_TEST_SIGNATURE)).toBe(true);
    });

    it('잘못된 시그니처 → false', () => {
      expect(adapter.verifyWebhook({}, 'wrong-signature')).toBe(false);
    });

    it('빈 시그니처 → false', () => {
      expect(adapter.verifyWebhook({}, '')).toBe(false);
    });

    it('true를 blindly 반환하지 않음', () => {
      expect(adapter.verifyWebhook({ any: 'payload' }, 'random')).toBe(false);
    });
  });
});
