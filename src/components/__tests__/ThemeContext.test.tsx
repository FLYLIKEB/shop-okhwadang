import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
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

  it('localStorage 값이 있으면 로케일 기본값보다 우선한다', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(
      <ThemeProvider locale="ko">
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
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
});
