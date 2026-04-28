import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Home from '@/app/[locale]/(routes)/page';
import { ThemeProvider } from '@/contexts/ThemeContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

function resolveByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc == null) return acc;
    if (Array.isArray(acc)) return acc[Number(part)];
    if (typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

function format(value: unknown, params?: Record<string, unknown>): string {
  if (typeof value !== 'string') return '';
  if (!params) return value;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
    value,
  );
}

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const messages = (await import('@/i18n/messages/ko.json')).default as Record<string, unknown>;
  return {
    ...actual,
    useLocale: () => 'ko',
    useTranslations: (namespace: string) => (key: string, params?: Record<string, unknown>) => {
      const value = resolveByPath(messages, `${namespace}.${key}`);
      return value == null ? key : format(value, params);
    },
  };
});

vi.mock('next-intl/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl/server')>();
  const messages = (await import('@/i18n/messages/ko.json')).default as Record<string, unknown>;
  return {
    ...actual,
    getTranslations: async (namespace: string) => {
      return (key: string, params?: Record<string, unknown>) => {
        const value = resolveByPath(messages, `${namespace}.${key}`);
        return value == null ? key : format(value, params);
      };
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ itemCount: 0 }),
}));

vi.mock('embla-carousel-react', () => ({
  default: () => [
    vi.fn(),
    {
      scrollNext: vi.fn(),
      scrollPrev: vi.fn(),
      scrollTo: vi.fn(),
      selectedScrollSnap: vi.fn().mockReturnValue(0),
      on: vi.fn(),
      off: vi.fn(),
    },
  ],
}));

vi.mock('embla-carousel-autoplay', () => ({
  default: () => ({}),
}));

vi.mock('@/lib/api-server', () => ({
  fetchPage: vi.fn().mockResolvedValue({
    blocks: [
      {
        id: 1,
        type: 'promotion_banner',
        is_visible: true,
        sort_order: 1,
        content: {
          title: '지금 바로 쇼핑하세요',
          subtitle: '테스트 배너',
          cta_text: null,
          cta_url: null,
        },
      },
    ],
  }),
}));


// Next.js App Router: test individual components (no router wrapper needed)

describe('Header', () => {
  it('renders the brand name', () => {
    render(
      <ThemeProvider locale="ko">
        <Header />
      </ThemeProvider>,
    );
    expect(screen.getByRole('img', { name: '옥화당' })).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(
      <ThemeProvider locale="ko">
        <Header />
      </ThemeProvider>,
    );
    expect(screen.getByText('상품목록')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '장바구니' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: '로그인' }).length).toBeGreaterThan(0);
  });
});

describe('Footer', () => {
  it('renders copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
  });
});

describe('Home page', () => {
  it('renders home page sections', async () => {
    const jsx = await Home({ params: Promise.resolve({ locale: 'ko' }) });
    render(jsx);
    expect(screen.getByText('지금 바로 쇼핑하세요')).toBeInTheDocument();
  });
});
