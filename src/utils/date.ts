import type { Locale } from '@/utils/currency';

const DATE_LOCALE_BY_LOCALE: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
};

const TIME_ZONE = 'UTC';

export function formatDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE_BY_LOCALE[locale], {
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

export function formatLongDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE_BY_LOCALE[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}
