'use client';

import { Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { supportsSavedThemePreference, useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

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

  if (!supportsSavedThemePreference(locale)) {
    return null;
  }

  const label = theme === 'dark' ? t('themeToggleToLight') : t('themeToggleToDark');

  return (
    <Button
      type="button"
      variant="gray"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn('h-8 min-h-8 w-8 rounded-md text-muted-foreground hover:text-foreground', className)}
    >
      {theme === 'dark' ? (
        <Sun className={cn('h-4 w-4', iconClassName)} aria-hidden="true" />
      ) : (
        <Moon className={cn('h-4 w-4', iconClassName)} aria-hidden="true" />
      )}
    </Button>
  );
}
