import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LanguageSelector from '@/components/shared/LanguageSelector';

let mockLocale = 'ko';
let openMock: ReturnType<typeof vi.fn>;

vi.mock('@/hooks/useUrlModal', async () => {
  const React = await import('react');
  return {
    useUrlModal: () => {
      const [isOpen, setIsOpenState] = React.useState(false);
      const setOpen = (open: boolean) => setIsOpenState(open);
      const close = () => setIsOpenState(false);
      return [isOpen, setOpen, close] as const;
    },
  };
});


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

beforeEach(() => {
  mockLocale = 'ko';
  openMock = vi.fn();
  vi.stubGlobal('open', openMock);
  window.history.replaceState({}, '', 'http://localhost:3000/ko');
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LanguageSelector', () => {
  it('renders current language flag and label', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: '언어 선택' })).toBeInTheDocument();
    expect(screen.getByText('한국어')).toBeInTheDocument();
  });

  it('opens dropdown on button click', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    expect(screen.getByRole('listbox', { name: '언어 목록' })).toBeInTheDocument();
  });

  it('shows ko and en language options', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.queryByText('日本語')).not.toBeInTheDocument();
    expect(screen.queryByText('中文')).not.toBeInTheDocument();
    expect(screen.getAllByText('한국어').length).toBeGreaterThan(0);
  });

  it('selecting a different language navigates to the localized path and closes dropdown', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    await user.click(screen.getByText('English'));
    expect(openMock).toHaveBeenCalledWith('/en', '_self');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('keeps the current pathname when switching language', async () => {
    window.history.replaceState({}, '', 'http://localhost:3000/ko/products/123?language=1#details');
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    await user.click(screen.getByText('English'));
    expect(openMock).toHaveBeenCalledWith('/en/products/123#details', '_self');
  });

  it('selecting current locale does not navigate', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    const options = screen.getAllByText('한국어');
    await user.click(options[options.length - 1]);
    expect(openMock).not.toHaveBeenCalled();
  });

  it('sets NEXT_LOCALE cookie on language change', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    await user.click(screen.getByText('English'));
    expect(document.cookie).toContain('NEXT_LOCALE=en');
  });

  it('closes dropdown on Escape key', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LanguageSelector />
        <div data-testid="outside">outside</div>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('compact mode shows only flag (no label)', () => {
    render(<LanguageSelector compact />);
    // label is not rendered
    expect(screen.queryByText('한국어')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '언어 선택' })).toBeInTheDocument();
  });

  it('shows English as current language when locale is en', () => {
    mockLocale = 'en';
    render(<LanguageSelector />);
    expect(screen.getByText('English')).toBeInTheDocument();
  });
});
