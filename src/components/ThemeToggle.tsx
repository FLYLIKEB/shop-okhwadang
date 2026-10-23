'use client';

import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { supportsSavedThemePreference, useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
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
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn('h-11 min-h-11 px-2 typo-body-sm font-normal text-foreground', className)}
    >
      {t(theme === 'dark' ? 'themeLightText' : 'themeDarkText')}
    </Button>
  );
}
