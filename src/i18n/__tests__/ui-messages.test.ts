import { describe, expect, it, vi } from 'vitest';
import { localMessage } from '@/utils/localMessages';
import { formatCurrency } from '@/utils/currency';
import { getClientLocale } from '@/utils/clientLocale';
import { toastMessage } from '@/utils/toastMessages';
import { getUiMessages, uiMessages } from '../ui-messages';
import koMessages from '../messages/ko.json';

vi.mock('next-intl/server', () => ({ getRequestConfig: (configure: unknown) => configure }));

describe('English interface with regional commerce settings', () => {
  it.each(['ko', 'en'] as const)('uses English messages without changing the %s request locale', async (locale) => {
    const { default: configure } = await import('../request');
    const result = await configure({ requestLocale: Promise.resolve(locale) });
    expect(result.locale).toBe(locale);
    expect(result.messages).toBe(getUiMessages(locale));
    expect(localMessage('header.login', undefined, locale)).toBe('LOGIN');
    expect(toastMessage('paymentComplete', undefined, locale)).toBe('Payment completed.');
  });

  it('keeps Korean policy and explanatory content alongside English controls', () => {
    const messages = getUiMessages('ko');
    expect(messages.product.tabs.deliveryGuide).toEqual(koMessages.product.tabs.deliveryGuide);
    expect(messages.product.tabs.exchangeRefundGuide).toEqual(koMessages.product.tabs.exchangeRefundGuide);
    expect(messages.product.tabs.noticeInfo).toEqual(koMessages.product.tabs.noticeInfo);
    expect(messages.shippingReturnsPage).toEqual(koMessages.shippingReturnsPage);
    expect(messages.cookieSettings).toEqual(koMessages.cookieSettings);
    expect(messages.product.listHeroDescription).toBe(koMessages.product.listHeroDescription);
    expect(messages.admin.guide.topics.popups.steps).toEqual(koMessages.admin.guide.topics.popups.steps);
    expect(messages.header.login).toBe('LOGIN');
    expect(messages.checkout.steps).toEqual(uiMessages.checkout.steps);
    expect(messages.cart.orderSummary).toBe(uiMessages.cart.orderSummary);
    expect(messages.product.addToCart).toBe(uiMessages.product.addToCart);
    expect(localMessage('product.tabs.deliveryGuide.method.value', undefined, 'ko')).toBe('택배 배송으로 안전하게 발송합니다.');
    expect(getUiMessages('en')).toBe(uiMessages);
    expect(localMessage('product.tabs.deliveryGuide.method.value', undefined, 'en')).toBe(uiMessages.product.tabs.deliveryGuide.method.value);
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
