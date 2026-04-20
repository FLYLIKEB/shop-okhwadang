'use client';

import { useRef, useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { useUrlModal } from '@/hooks/useUrlModal';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';

interface LangOption {
  locale: Locale;
  flag: string;
  label: string;
}

const LANG_OPTIONS: LangOption[] = [
  { locale: 'ko', flag: '🇰🇷', label: '한국어' },
  { locale: 'en', flag: '🇺🇸', label: 'English' },
  { locale: 'ja', flag: '🇯🇵', label: '日本語' },
  { locale: 'zh', flag: '🇨🇳', label: '中文' },
];

interface LanguageSelectorProps {
  className?: string;
  /** compact: flag only; full: flag + label (default full) */
  compact?: boolean;
}

export default function LanguageSelector({ className, compact = false }: LanguageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;
  const t = useTranslations('header');
  const [isOpen, setIsOpen] = useUrlModal('language');
  const containerRef = useRef<HTMLDivElement>(null);

  const current = LANG_OPTIONS.find((o) => o.locale === currentLocale) ?? LANG_OPTIONS[0];

  const handleSelect = (locale: Locale) => {
    setIsOpen(false);
    if (locale === currentLocale) return;
    // Save to cookie (NEXT_LOCALE) — next-intl reads this automatically
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.replace(pathname, { locale });
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false, 'replace');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  // Close on Escape
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
          'flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
        )}
      >
        <span aria-hidden="true">{current.flag}</span>
        {!compact && <span>{current.label}</span>}
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('languageList')}
          className={cn(
            'absolute right-0 top-full mt-1 z-50',
            'min-w-[8rem] rounded-md border border-border bg-background shadow-md',
            'py-1',
          )}
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
                  <span aria-hidden="true">{option.flag}</span>
                  <span>{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Re-export for tree-shaking convenience
export { LANG_OPTIONS, routing };
