import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from '@/contexts/ThemeContext';

function ThemeDisplay() {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => setTheme('light')}>set-light</button>
      <button onClick={() => setTheme('dark')}>set-dark</button>
    </div>
  );
}

function TestThemeProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <ThemeProvider locale={locale}>{children}</ThemeProvider>;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('ko 로케일 기본값은 dark', () => {
    render(
      <ThemeProvider locale="ko">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('en 로케일 기본값은 light', () => {
    render(
      <ThemeProvider locale="en">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('ko 로케일은 localStorage 값을 반영한다', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(
      <ThemeProvider locale="ko">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('en 로케일은 localStorage에 dark가 있어도 light로 고정된다', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(
      <ThemeProvider locale="en">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('localStorage 값이 잘못된 경우 로케일 기본값으로 폴백', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid');
    render(
      <ThemeProvider locale="en">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('toggleTheme가 dark ↔ light를 전환하고 localStorage를 갱신한다', () => {
    render(
      <ThemeProvider locale="ko">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');

    act(() => {
      screen.getByText('toggle').click();
    });
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => {
      screen.getByText('toggle').click();
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('setTheme 직접 호출도 localStorage + dataset을 동기화한다', () => {
    render(
      <ThemeProvider locale="en">
        <ThemeDisplay />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText('set-dark').click();
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('locale이 ko에서 en으로 바뀌면 theme가 light로 재동기화된다', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { rerender } = render(
      <TestThemeProvider locale="ko">
        <ThemeDisplay />
      </TestThemeProvider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');

    rerender(
      <TestThemeProvider locale="en">
        <ThemeDisplay />
      </TestThemeProvider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
