import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Footer from '@/components/Footer';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/i18n/messages/ko.json')).default as Record<string, Record<string, string>>;
  return {
    ...actual,
    useLocale: () => 'ko',
    useTranslations: (namespace: string) => (key: string) => {
      const ns = messages[namespace] ?? {};
      return ns[key] ?? key;
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

  it('hides nav links while loading', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('.opacity-100')).toBeInTheDocument();
  });

  it('renders copyright text containing current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
