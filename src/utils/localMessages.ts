import koMessages from '@/i18n/messages/ko.json';
import enMessages from '@/i18n/messages/en.json';
import { getClientLocale } from '@/utils/clientLocale';
import type { Locale } from '@/utils/currency';

const MESSAGES = { ko: koMessages, en: enMessages } as const;

type MessageTree = Record<string, unknown>;

export function localMessage(path: string, values?: Record<string, string | number>, localeOverride?: Locale): string {
  const locale = localeOverride ?? getClientLocale();
  const segments = path.split('.');
  let current: unknown = MESSAGES[locale] as MessageTree;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) return path.split('.').at(-1) ?? path;
    current = (current as MessageTree)[segment];
  }
  if (typeof current !== 'string') return path.split('.').at(-1) ?? path;
  if (!values) return current;
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    current,
  );
}
