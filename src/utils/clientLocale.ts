import type { Locale } from '@/utils/currency';

export function getClientLocale(): Locale {
  if (typeof document !== 'undefined' && document.documentElement.lang === 'en') return 'en';
  if (typeof window !== 'undefined' && (window.location.pathname ?? '').startsWith('/en')) return 'en';
  return 'ko';
}
