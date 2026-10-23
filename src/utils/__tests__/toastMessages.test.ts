import { describe, expect, it } from 'vitest';
import { toastMessage } from '@/utils/toastMessages';

describe('toastMessages guest-checkout coverage', () => {
  it('keeps checkout completion messages localized for both locales', () => {
    expect(toastMessage('paymentComplete', undefined, 'ko')).toBe('Payment completed.');
    expect(toastMessage('paymentComplete', undefined, 'en')).toBe('Payment completed.');
    expect(toastMessage('bankTransferOrderReceived', undefined, 'ko')).toBe('Order received. Please complete the bank transfer.');
    expect(toastMessage('bankTransferOrderReceived', undefined, 'en')).toBe('Order received. Please complete the bank transfer.');
  });

  it('keeps hosted confirm failure messages localized for both locales', () => {
    expect(toastMessage('paymentConfirmError', undefined, 'ko')).toBe('An error occurred while confirming payment.');
    expect(toastMessage('paymentConfirmError', undefined, 'en')).toBe('An error occurred while confirming payment.');
    expect(toastMessage('paymentContextMissing', undefined, 'ko')).toBe('Payment context was not found.');
    expect(toastMessage('paymentContextMissing', undefined, 'en')).toBe('Payment context was not found.');
  });
});
