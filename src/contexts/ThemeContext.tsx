'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const DEFAULT_THEME_BY_LOCALE: Record<string, Theme> = {
  ko: 'dark',
  en: 'light',
};

export const THEME_STORAGE_KEY = 'theme';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function getDefaultThemeForLocale(locale: string): Theme {
  return DEFAULT_THEME_BY_LOCALE[locale] ?? 'light';
}

export function getInitialTheme(locale: string): Theme {
  const defaultTheme = getDefaultThemeForLocale(locale);
  if (typeof window === 'undefined') {
    return defaultTheme;
  }
  if (defaultTheme === 'light') {
    return 'light';
  }
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // localStorage unavailable (e.g. private mode) — fall back to locale default
  }
  return defaultTheme;
}

interface ThemeProviderProps {
  children: ReactNode;
  locale: string;
}

export function ThemeProvider({ children, locale }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme(locale));

  useEffect(() => {
    setThemeState(getInitialTheme(locale));
  }, [locale]);

  // Sync dataset on mount and whenever theme changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // localStorage unavailable — silently ignore; dataset still updates via effect
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
