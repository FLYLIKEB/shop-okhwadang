import { describe, expect, it, vi } from 'vitest';
import { localMessage } from '@/utils/localMessages';
import { formatCurrency } from '@/utils/currency';
import { getClientLocale } from '@/utils/clientLocale';
import { toastMessage } from '@/utils/toastMessages';
import { uiMessages } from '../ui-messages';

vi.mock('next-intl/server', () => ({ getRequestConfig: (configure: unknown) => configure }));

describe('English interface with regional commerce settings', () => {
  it.each(['ko', 'en'] as const)('uses English messages without changing the %s request locale', async (locale) => {
    const { default: configure } = await import('../request');
    const result = await configure({ requestLocale: Promise.resolve(locale) });
    expect(result.locale).toBe(locale);
    expect(result.messages).toBe(uiMessages);
    expect(localMessage('header.login', undefined, locale)).toBe('LOGIN');
    expect(toastMessage('paymentComplete', undefined, locale)).toBe('Payment completed.');
  });

  it('keeps Korean routes and won amounts while displaying English controls', () => {
    const originalLang = document.documentElement.lang;
    const originalPath = window.location.pathname;
    document.documentElement.lang = 'ko';
    window.history.replaceState(null, '', '/ko/products');
    try {
      expect(getClientLocale()).toBe('ko');
      expect(localMessage('header.login')).toBe('LOGIN');
      expect(formatCurrency(15000, getClientLocale())).toContain('15,000');
      expect(formatCurrency(15000, getClientLocale())).not.toContain('$');
    } finally {
      document.documentElement.lang = originalLang;
      window.history.replaceState(null, '', originalPath);
    }
  });
});
