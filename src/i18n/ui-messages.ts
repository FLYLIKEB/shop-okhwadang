import enMessages from './messages/en.json';
import koMessages from './messages/ko.json';
import { adminKoreanMessages } from './admin-korean-messages';

export const uiMessages = { ...enMessages, admin: koMessages.admin, adminEnglish: adminKoreanMessages };

// Sentence-like messages (errors, placeholders, aria, status, empty states) stay Korean; short labels/buttons stay English.
const KOREAN_LEAF_PATTERN = /(?:description|subtitle|body|caution|help|hint|error|[a-z]+success|placeholder|aria|loading|loadingAddresses|loadingPaymentMethods|unavailable|noCoupons|noSavedAddress|noReviews|noResults|noImages|hasAccount|noAccount|thanks|ready|machineTranslated|mockPayment|smartstore|smartstoreIncluded|processingOAuth|submitting|loginSubmitting|registerSubmitting|translating|uploading|searching|openSubmenu|menuBackTo|priceMaxOrLess|priceMinOrMore|minimumOrderAmount|pointsBalance|shippingDate)$/i;
const KOREAN_GROUPS = new Set(['validation']);

function restoreKoreanBody<T>(english: T, korean: unknown): T {
  if (!english || typeof english !== 'object' || Array.isArray(english) || !korean || typeof korean !== 'object') return english;
  return Object.fromEntries(Object.entries(english).map(([key, value]) => {
    const original = (korean as Record<string, unknown>)[key];
    if (typeof original === 'string' && KOREAN_LEAF_PATTERN.test(key)) {
      return [key, original];
    }
    if (KOREAN_GROUPS.has(key) && original && typeof original === 'object') return [key, original];
    return [key, restoreKoreanBody(value, original)];
  })) as T;
}

const koreanBodyMessages = restoreKoreanBody(uiMessages, koMessages);
const koreanUiMessages = {
  ...koreanBodyMessages,
  home: { ...koreanBodyMessages.home, metaTitle: koMessages.home.metaTitle },
  product: {
    ...koreanBodyMessages.product,
    tabs: {
      ...koreanBodyMessages.product.tabs,
      deliveryGuide: koMessages.product.tabs.deliveryGuide,
      exchangeRefundGuide: koMessages.product.tabs.exchangeRefundGuide,
      noticeInfo: koMessages.product.tabs.noticeInfo,
    },
  },
  review: {
    ...koreanBodyMessages.review,
    smartstore: koMessages.review.smartstore,
    smartstoreIncluded: koMessages.review.smartstoreIncluded,
  },
  preOrder: koMessages.preOrder,
  shippingReturnsPage: koMessages.shippingReturnsPage,
  cookieSettings: koMessages.cookieSettings,
};

export function getUiMessages(locale: string): typeof uiMessages {
  return locale === 'en' ? uiMessages : koreanUiMessages;
}
