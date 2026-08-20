import type { Locale } from '@/utils/currency';

const DATE_LOCALE_BY_LOCALE: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
};

const DEFAULT_LOCALE: Locale = 'ko';
const TIME_ZONE = 'UTC';
const INVALID_DATE_FALLBACK = '—';

type LocaleInput = Locale | string;

export type FormatDateTimeOptions = Omit<Intl.DateTimeFormatOptions, 'timeZone'>;

function resolveDateLocale(locale: LocaleInput): string {
  return DATE_LOCALE_BY_LOCALE[locale as Locale] ?? DATE_LOCALE_BY_LOCALE[DEFAULT_LOCALE];
}

function toValidDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatUtcDate(
  value: string | Date,
  locale: LocaleInput,
  options: FormatDateTimeOptions,
): string {
  const date = toValidDate(value);
  if (!date) return INVALID_DATE_FALLBACK;

  return new Intl.DateTimeFormat(resolveDateLocale(locale), {
    ...options,
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatDate(value: string | Date, locale: LocaleInput): string {
  return formatUtcDate(value, locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

export function formatLongDate(value: string | Date, locale: LocaleInput): string {
  return formatUtcDate(value, locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(
  value: string | Date,
  locale: LocaleInput,
  options: FormatDateTimeOptions = {},
): string {
  return formatUtcDate(value, locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  });
}

export function formatCount(value: number, locale: LocaleInput): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(resolveDateLocale(locale)).format(safeValue);
}
