import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LanguageSelector from '@/components/shared/LanguageSelector';

const mockReplace = vi.fn();
let mockPathname = '/';
let mockLocale = 'ko';

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale,
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockPathname = '/';
  mockLocale = 'ko';
  // Reset document.cookie
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
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

  it('shows all 4 language options', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('日本語')).toBeInTheDocument();
    expect(screen.getByText('中文')).toBeInTheDocument();
    expect(screen.getAllByText('한국어').length).toBeGreaterThan(0);
  });

  it('selecting a different language calls router.replace and closes dropdown', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    await user.click(screen.getByText('English'));
    expect(mockReplace).toHaveBeenCalledWith('/', { locale: 'en' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selecting current locale does not call router.replace', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    // Click 한국어 (current locale is 'ko')
    const options = screen.getAllByText('한국어');
    await user.click(options[options.length - 1]);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sets NEXT_LOCALE cookie on language change', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: '언어 선택' }));
    await user.click(screen.getByText('日本語'));
    expect(document.cookie).toContain('NEXT_LOCALE=ja');
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
