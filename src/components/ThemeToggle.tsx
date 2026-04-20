'use client';

import { Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { getDefaultThemeForLocale, useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

/**
 * 다크/라이트 테마 토글 버튼.
 * - 현재 테마가 dark → Sun 아이콘(클릭 시 light로 전환)
 * - 현재 테마가 light → Moon 아이콘(클릭 시 dark로 전환)
 * - aria-label/title은 next-intl `header.themeToggle*` 키에서 조회
 */
export default function ThemeToggle({ className, iconClassName }: ThemeToggleProps) {
  const locale = useLocale();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations('header');

  if (getDefaultThemeForLocale(locale) === 'light') {
    return null;
  }

  const label = theme === 'dark' ? t('themeToggleToLight') : t('themeToggleToDark');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'p-2 text-muted-foreground hover:text-foreground transition-colors',
        className,
      )}
    >
      {theme === 'dark' ? (
        <Sun className={cn('h-5 w-5', iconClassName)} aria-hidden="true" />
      ) : (
        <Moon className={cn('h-5 w-5', iconClassName)} aria-hidden="true" />
      )}
    </button>
  );
}
