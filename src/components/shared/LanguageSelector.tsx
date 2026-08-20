'use client';

import { useRef, useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useUrlModal } from '@/hooks/useUrlModal';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

interface LangOption {
  locale: Locale;
  label: string;
  shortLabel: string;
}

const LANG_OPTIONS: LangOption[] = [
  { locale: 'ko', label: '한국어', shortLabel: 'KO' },
  { locale: 'en', label: 'English', shortLabel: 'EN' },
];

interface LanguageSelectorProps {
  className?: string;
  /** compact: icon only; full: icon + label (default full) */
  compact?: boolean;
  /**
   * inline: 모바일 사이드바용 — 드롭다운 없이 세그먼트 버튼으로 표시
   * dropdown: 기본 드롭다운 방식 (default)
   */
  variant?: 'dropdown' | 'inline';
}

function getInternalHref(): string {
  if (typeof window === 'undefined') return '/';

  const url = new URL(window.location.href);
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments.length > 0 && routing.locales.includes(segments[0] as Locale)) {
    segments.shift();
  }

  const pathname = `/${segments.join('/')}`;
  url.pathname = pathname;
  url.searchParams.delete('language');
  return `${url.pathname}${url.search}${url.hash}`;
}

function getLocalizedHref(locale: Locale): string {
  const href = getInternalHref();
  if (href === '/') return `/${locale}`;
  if (href.startsWith('/?') || href.startsWith('/#')) return `/${locale}${href.slice(1)}`;
  return `/${locale}${href}`;
}

function switchLocale(
  locale: Locale,
  currentLocale: Locale,
  onNavigate: (href: string) => void,
) {
  if (locale === currentLocale) return;
  // Service risk: `next-intl` locale navigation syncs NEXT_LOCALE via `document.cookie`,
  // which cannot enforce HttpOnly. Keep this URL builder aligned if routing gains
  // localized pathnames or domain-based locale routing, or language switches can break.
  onNavigate(getLocalizedHref(locale));
}

/** 모바일 사이드바용 — 세그먼트 버튼, 드롭다운 없음 */
function InlineLanguageSelector({ className }: { className?: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const currentLocale = useLocale() as Locale;
  const t = useTranslations('header');

  return (
    <div className={cn('flex items-center gap-3', className)} role="group" aria-label={t('languageSelector')}>
      <Globe className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
      <div className="flex rounded-md border border-border overflow-hidden">
        {LANG_OPTIONS.map((option, idx) => {
          const isSelected = option.locale === currentLocale;
          return (
            <Button
              key={option.locale}
              type="button"
              variant={isSelected ? 'black' : 'gray'}
              size="sm"
              onClick={() => {
                startTransition(() => {
                  switchLocale(option.locale, currentLocale, (href) => router.replace(href));
                });
              }}
              aria-pressed={isSelected}
              aria-label={option.label}
              className={cn('min-h-9 rounded-none px-3 py-1.5', idx > 0 && 'border-l border-border')}
            >
              {option.shortLabel}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/** 데스크탑용 드롭다운 언어 전환 */
function DropdownLanguageSelector({ className, compact = false }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const currentLocale = useLocale() as Locale;
  const t = useTranslations('header');
  const [isOpen, setIsOpen] = useUrlModal('language');
  const containerRef = useRef<HTMLDivElement>(null);

  const current = LANG_OPTIONS.find((o) => o.locale === currentLocale) ?? LANG_OPTIONS[0];

  const handleSelect = (locale: Locale) => {
    setIsOpen(false, 'replace');
    startTransition(() => {
      switchLocale(locale, currentLocale, (href) => router.replace(href));
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false, 'replace');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="gray"
        size="sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('languageSelector')}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {!compact && <span>{current.shortLabel}</span>}
      </Button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('languageList')}
          className="absolute right-0 top-full mt-1 z-50 min-w-[8rem] rounded-md border border-border bg-background shadow-md py-1"
        >
          {LANG_OPTIONS.map((option) => {
            const isSelected = option.locale === currentLocale;
            return (
              <li key={option.locale} role="option" aria-selected={isSelected}>
                <Button
                  type="button"
                  variant={isSelected ? 'black' : 'gray'}
                  size="sm"
                  onClick={() => handleSelect(option.locale)}
                  className="w-full justify-start rounded-none px-3 py-1.5 text-left"
                >
                  {option.label}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function LanguageSelector({ className, compact = false, variant = 'dropdown' }: LanguageSelectorProps) {
  if (variant === 'inline') return <InlineLanguageSelector className={className} />;
  return <DropdownLanguageSelector className={className} compact={compact} />;
}

export { LANG_OPTIONS, routing };
