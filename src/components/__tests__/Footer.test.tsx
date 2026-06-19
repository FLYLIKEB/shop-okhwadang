import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Footer from '@/components/Footer';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, prefetch, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean; [key: string]: unknown }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/i18n/messages/ko.json')).default as unknown as Record<string, unknown>;
  const resolvePath = (root: unknown, path: string): unknown =>
    path.split('.').reduce<unknown>((acc, segment) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[segment];
      }
      return undefined;
    }, root);
  const format = (value: string, params?: Record<string, unknown>) => {
    if (!params) return value;
    return Object.entries(params).reduce(
      (acc, [paramKey, paramValue]) => acc.replace(`{${paramKey}}`, String(paramValue)),
      value,
    );
  };

  return {
    ...actual,
    useLocale: () => 'ko',
    useTranslations: (namespace: string) => (key: string, params?: Record<string, unknown>) => {
      const value = resolvePath(messages[namespace], key);
      return typeof value === 'string' ? format(value, params) : key;
    },
  };
});

vi.mock('@/hooks/useNavigation', () => ({
  useNavigation: () => ({
    loading: false,
    items: [
      { id: 20, group: 'footer', label: '고객센터', url: '/pages/support', sort_order: 0, is_active: true, parent_id: null },
      { id: 21, group: 'footer', label: '자주 묻는 질문', url: '/faq', sort_order: 1, is_active: true, parent_id: null },
      { id: 22, group: 'footer', label: '배송 안내', url: '/pages/shipping', sort_order: 2, is_active: true, parent_id: null },
      { id: 23, group: 'footer', label: '반품 및 교환', url: '/pages/returns', sort_order: 3, is_active: true, parent_id: null },
      { id: 24, group: 'footer', label: '이용약관', url: '/pages/terms', sort_order: 4, is_active: true, parent_id: null },
      { id: 25, group: 'footer', label: '개인정보처리방침', url: '/pages/privacy', sort_order: 5, is_active: true, parent_id: null },
      { id: 26, group: 'footer', label: '전체 상품', url: '/products', sort_order: 6, is_active: true, parent_id: null },
      { id: 27, group: 'footer', label: '컬렉션', url: '/collection', sort_order: 7, is_active: true, parent_id: null },
      { id: 28, group: 'footer', label: 'Archive', url: '/archive', sort_order: 8, is_active: true, parent_id: null },
      { id: 29, group: 'footer', label: '저널', url: '/journal', sort_order: 9, is_active: true, parent_id: null },
    ],
  }),
}));

describe('Footer', () => {
  it('renders 이용약관, 개인정보처리방침, 고객센터 links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: '이용약관' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '고객센터' })).toBeInTheDocument();
  });

  it('disables prefetch for footer navigation links', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: '전체 상품' })).toHaveAttribute('data-prefetch', 'false');
    expect(screen.getByRole('link', { name: '고객센터' })).toHaveAttribute('data-prefetch', 'false');
  });

  it('renders footer section headings larger and bold', () => {
    render(<Footer />);

    for (const heading of ['고객센터', '회사', '쇼핑']) {
      const sectionHeading = screen.getAllByText(heading).find((element) => element.tagName === 'P');

      expect(sectionHeading).toHaveClass('typo-body', 'font-semibold', 'text-foreground');
      expect(sectionHeading).not.toHaveClass('text-sm', 'font-medium');
    }
  });

  it('renders footer without solid or dotted divider lines', () => {
    const { container } = render(<Footer />);

    expect(container.querySelector('footer')?.className).not.toContain('border-');
    expect(container.innerHTML).not.toContain('border-divider-soft');
    expect(container.innerHTML).not.toContain('border-dashed');
  });

  it('hides nav links while loading', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('.opacity-100')).toBeInTheDocument();
  });

  it('renders centered copyright text with normal Pretendard body styling', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    const copyright = screen.getByText(new RegExp(`${year} OCKHWADANG`));

    expect(copyright).toBeInTheDocument();
    expect(copyright).toHaveClass('typo-body-sm', 'font-body', 'text-muted-foreground');
    expect(copyright).not.toHaveClass('font-mono', 'font-display', 'italic');
    expect(copyright.closest('.text-center')).toBeInTheDocument();
  });

  it('does not render the old display-font footer seal', () => {
    render(<Footer />);
    expect(screen.queryByText('玉華堂')).not.toBeInTheDocument();
  });

  it('renders required business information (상호·대표자·사업자번호·통신판매번호·소재지)', () => {
    render(<Footer />);
    expect(screen.getByText(/서로 인터내셔널/)).toBeInTheDocument();
    expect(screen.getByText(/권준현/)).toBeInTheDocument();
    expect(screen.getByText(/131-72-05631/)).toBeInTheDocument();
    expect(screen.getByText(/2026-서울강남-01632/)).toBeInTheDocument();
    expect(screen.getByText(/역삼로 114/)).toBeInTheDocument();
  });
});
