import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageSelector from '@/components/shared/LanguageSelector';

let mockLocale = 'ko';
const replaceMock = vi.fn();
let historyBackSpy: ReturnType<typeof vi.spyOn>;

const translations: Record<string, string> = {
  'header.languageSelector': '언어 선택',
  'header.languageList': '언어 목록',
};

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useTranslations: (namespace?: string) => (key: string) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return translations[fullKey] ?? fullKey;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

describe('LanguageSelector integration', () => {
  beforeEach(() => {
    mockLocale = 'ko';
    replaceMock.mockClear();
    historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    window.history.replaceState({}, '', 'http://localhost:3000/ko?search=1');
  });

  afterEach(() => {
    historyBackSpy?.mockRestore();
  });

  it('keeps localized navigation when selecting a new language after opening from URL state', async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);

    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    expect(window.location.search).toContain('language=1');
    expect(screen.getByRole('listbox', { name: '언어 목록' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'English' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/en?search=1');
    });
    expect(historyBackSpy).not.toHaveBeenCalled();
  });
});
