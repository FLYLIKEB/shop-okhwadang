import { describe, expect, it } from 'vitest';
import { toastMessage } from '@/utils/toastMessages';

describe('toastMessages guest-checkout coverage', () => {
  it('keeps checkout completion messages localized for both locales', () => {
    expect(toastMessage('paymentComplete', undefined, 'ko')).toBe('결제가 완료되었습니다.');
    expect(toastMessage('paymentComplete', undefined, 'en')).toBe('Payment completed.');
    expect(toastMessage('bankTransferOrderReceived', undefined, 'ko')).toBe('주문이 접수되었습니다. 무통장입금을 진행해 주세요.');
    expect(toastMessage('bankTransferOrderReceived', undefined, 'en')).toBe('Order received. Please complete the bank transfer.');
  });

  it('keeps hosted confirm failure messages localized for both locales', () => {
    expect(toastMessage('paymentConfirmError', undefined, 'ko')).toBe('결제 확인 중 오류가 발생했습니다.');
    expect(toastMessage('paymentConfirmError', undefined, 'en')).toBe('An error occurred while confirming payment.');
    expect(toastMessage('paymentContextMissing', undefined, 'ko')).toBe('결제 컨텍스트를 찾을 수 없습니다.');
    expect(toastMessage('paymentContextMissing', undefined, 'en')).toBe('Payment context was not found.');
  });
});
