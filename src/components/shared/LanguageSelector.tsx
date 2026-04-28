'use client';

import { useRef, useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useUrlModal } from '@/hooks/useUrlModal';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';

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

function getLocalizedHref(nextLocale: Locale): string {
  if (typeof window === 'undefined') return `/${nextLocale}`;

  const url = new URL(window.location.href);
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments.length > 0 && routing.locales.includes(segments[0] as Locale)) {
    segments[0] = nextLocale;
  } else {
    segments.unshift(nextLocale);
  }

  url.pathname = `/${segments.join('/')}`;
  url.searchParams.delete('language');
  return `${url.pathname}${url.search}${url.hash}`;
}

function switchLocale(locale: Locale, currentLocale: Locale, onNavigate: (href: string) => void) {
  if (locale === currentLocale) return;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
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
            <button
              key={option.locale}
              type="button"
              onClick={() => {
                startTransition(() => {
                  switchLocale(option.locale, currentLocale, (href) => router.replace(href));
                });
              }}
              aria-pressed={isSelected}
              aria-label={option.label}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors min-h-9',
                idx > 0 && 'border-l border-border',
                isSelected
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {option.shortLabel}
            </button>
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
    setIsOpen(false);
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
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('languageSelector')}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
        )}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {!compact && <span>{current.shortLabel}</span>}
      </button>

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
                <button
                  type="button"
                  onClick={() => handleSelect(option.locale)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors',
                    isSelected
                      ? 'text-foreground font-medium bg-muted'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  {option.label}
                </button>
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
