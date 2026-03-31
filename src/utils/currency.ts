export type Currency = 'KRW' | 'USD' | 'JPY' | 'CNY';
export type Locale = 'ko' | 'en' | 'ja' | 'zh';

/** KRW 기준 환율 (1 단위 외화 = N KRW) */
const DEFAULT_RATES: Record<Exclude<Currency, 'KRW'>, number> = {
  USD: 1350,
  JPY: 9,
  CNY: 190,
};

function getExchangeRates(): Record<Exclude<Currency, 'KRW'>, number> {
  const envRaw =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_EXCHANGE_RATES
      : undefined;

  if (!envRaw) return DEFAULT_RATES;

  try {
    const parsed = JSON.parse(envRaw) as Partial<Record<Exclude<Currency, 'KRW'>, number>>;
    return {
      USD: parsed.USD ?? DEFAULT_RATES.USD,
      JPY: parsed.JPY ?? DEFAULT_RATES.JPY,
      CNY: parsed.CNY ?? DEFAULT_RATES.CNY,
    };
  } catch {
    return DEFAULT_RATES;
  }
}

const LOCALE_TO_CURRENCY: Record<Locale, Currency> = {
  ko: 'KRW',
  en: 'USD',
  ja: 'JPY',
  zh: 'CNY',
};

const CURRENCY_FORMAT: Record<Currency, { locale: string; currency: string }> = {
  KRW: { locale: 'ko-KR', currency: 'KRW' },
  USD: { locale: 'en-US', currency: 'USD' },
  JPY: { locale: 'ja-JP', currency: 'JPY' },
  CNY: { locale: 'zh-CN', currency: 'CNY' },
};

/**
 * KRW 금액을 대상 통화로 변환합니다.
 * @param amount KRW 기준 금액
 * @param to 대상 통화
 */
export function convertPrice(amount: number, to: Currency): number {
  if (to === 'KRW') return amount;
  const rates = getExchangeRates();
  return amount / rates[to];
}

/**
 * KRW 금액을 로케일에 맞는 통화 형식으로 포맷합니다.
 * @param amount KRW 기준 금액
 * @param locale 표시 로케일
 */
export function formatCurrency(amount: number, locale: Locale = 'ko'): string {
  const currency = LOCALE_TO_CURRENCY[locale];
  const converted = convertPrice(amount, currency);
  const { locale: intlLocale, currency: intlCurrency } = CURRENCY_FORMAT[currency];

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: intlCurrency,
    maximumFractionDigits: currency === 'KRW' || currency === 'JPY' ? 0 : 2,
    minimumFractionDigits: currency === 'KRW' || currency === 'JPY' ? 0 : 2,
  }).format(converted);
}
