import enMessages from './messages/en.json';
import koMessages from './messages/ko.json';
import { adminKoreanMessages } from './admin-korean-messages';

export const uiMessages = { ...enMessages, admin: koMessages.admin, adminEnglish: adminKoreanMessages };

function restoreKoreanBody<T>(english: T, korean: unknown): T {
  if (!english || typeof english !== 'object' || Array.isArray(english) || !korean || typeof korean !== 'object') return english;
  return Object.fromEntries(Object.entries(english).map(([key, value]) => {
    const original = (korean as Record<string, unknown>)[key];
    if (typeof original === 'string' && /(?:description|subtitle|body|caution|help|hint)$/i.test(key)) {
      return [key, original];
    }
    return [key, restoreKoreanBody(value, original)];
  })) as T;
}

const koreanBodyMessages = restoreKoreanBody(uiMessages, koMessages);
const koreanUiMessages = {
  ...koreanBodyMessages,
  product: {
    ...koreanBodyMessages.product,
    tabs: {
      ...koreanBodyMessages.product.tabs,
      deliveryGuide: koMessages.product.tabs.deliveryGuide,
      exchangeRefundGuide: koMessages.product.tabs.exchangeRefundGuide,
      noticeInfo: koMessages.product.tabs.noticeInfo,
    },
  },
  preOrder: koMessages.preOrder,
  shippingReturnsPage: koMessages.shippingReturnsPage,
  cookieSettings: koMessages.cookieSettings,
};

export function getUiMessages(locale: string): typeof uiMessages {
  return locale === 'en' ? uiMessages : koreanUiMessages;
}
