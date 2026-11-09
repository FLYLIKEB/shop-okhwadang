import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server.node';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { HOME_PAGE_CONTENT_ERROR_CODE } from '@/lib/storefront-diagnostics';
import Home, { generateMetadata } from '@/app/[locale]/(routes)/page';
import { ThemeProvider } from '@/contexts/ThemeContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
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
    getTranslations: async (scope: string | { locale: string; namespace: string }) => {
      const namespace = typeof scope === 'string' ? scope : scope.namespace;
      return (key: string, params?: Record<string, unknown>) => {
        const value = resolveByPath(messages, `${namespace}.${key}`);
        return value == null ? key : format(value, params);
      };
    },
  };
});

const mockFetchPage = vi.hoisted(() => vi.fn().mockResolvedValue({
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
}));
const mockFetchProducts = vi.hoisted(() => vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 4 }));
const mockFetchCategories = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockFetchJournals = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/api-server', () => ({
  fetchPage: mockFetchPage,
  fetchProducts: mockFetchProducts,
  fetchCategories: mockFetchCategories,
  fetchJournals: mockFetchJournals,
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
  beforeEach(() => {
    mockFetchPage.mockClear();
    mockFetchProducts.mockClear();
    mockFetchCategories.mockClear();
    mockFetchJournals.mockClear();
  });

  it('renders home page sections', async () => {
    const jsx = await Home({ params: Promise.resolve({ locale: 'ko' }) });
    const content = jsx.props.children[2].props.children;
    render(await content.type(content.props));
    expect(screen.getByText('지금 바로 쇼핑하세요')).toBeInTheDocument();
    expect(mockFetchPage).toHaveBeenCalledWith('home', 'ko');
  });

  it('streams the hero while lower product data is pending', async () => {
    let resolveProducts!: (value: { items: never[]; total: number; page: number; limit: number }) => void;
    mockFetchProducts.mockReturnValueOnce(new Promise((resolve) => { resolveProducts = resolve; }));
    mockFetchPage.mockResolvedValueOnce({ blocks: [
      { id: 1, type: 'hero_banner', is_visible: true, sort_order: 0,
        content: { template: 'slider', slides: [{ title: 'Immediate hero' }] } },
      { id: 2, type: 'product_grid', is_visible: true, sort_order: 1,
        content: { title: 'Delayed products', limit: 4 } },
    ] });
    const jsx = await Home({ params: Promise.resolve({ locale: 'ko' }) });
    const output = new PassThrough();
    let html = '';
    output.on('data', (chunk) => { html += chunk.toString(); });
    const finished = new Promise<void>((resolve) => output.on('end', resolve));
    const shell = new Promise<void>((resolve, reject) => {
      const stream = renderToPipeableStream(jsx, {
        onShellReady() { stream.pipe(output); resolve(); },
        onError: reject,
      });
    });
    try {
      await shell;
      expect(html).toContain('Immediate hero');
      expect(html).not.toContain('Delayed products');
      expect(mockFetchProducts).toHaveBeenCalledTimes(1);
    } finally {
      resolveProducts({ items: [], total: 0, page: 1, limit: 4 });
      await finished;
    }
  });

  it('throws an operator-facing error when home CMS content is missing', async () => {
    mockFetchPage.mockResolvedValueOnce(null);

    await expect(Home({ params: Promise.resolve({ locale: 'ko' }) })).rejects.toMatchObject({
      name: HOME_PAGE_CONTENT_ERROR_CODE,
    });
  });

  it('deduplicates shared CMS prefetches and skips hidden blocks', async () => {
    const productContent = { limit: 4, sort: 'latest' as const };
    mockFetchPage.mockResolvedValueOnce({
      blocks: [
        { id: 1, type: 'product_grid', is_visible: true, sort_order: 0, content: productContent },
        { id: 2, type: 'product_carousel', is_visible: true, sort_order: 1, content: productContent },
        { id: 3, type: 'product_grid', is_visible: false, sort_order: 2, content: productContent },
        { id: 4, type: 'category_nav', is_visible: true, sort_order: 3, content: {} },
        { id: 5, type: 'category_nav', is_visible: true, sort_order: 4, content: {} },
        { id: 6, type: 'journal_preview', is_visible: true, sort_order: 5, content: { limit: 3 } },
        { id: 7, type: 'journal_preview', is_visible: true, sort_order: 6, content: { limit: 3 } },
      ],
    });

    const jsx = await Home({ params: Promise.resolve({ locale: 'ko' }) });
    const content = jsx.props.children[2].props.children;
    await content.type(content.props);

    expect(mockFetchProducts).toHaveBeenCalledTimes(1);
    expect(mockFetchCategories).toHaveBeenCalledTimes(1);
    expect(mockFetchJournals).toHaveBeenCalledTimes(1);
  });

  it.each(['favicon.ico', 'robots.txt', 'sitemap.xml', 'logo.png'])(
    'does not call CMS APIs when %s is matched as an invalid locale segment',
    async (locale) => {
      await expect(Home({ params: Promise.resolve({ locale }) })).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mockFetchPage).not.toHaveBeenCalled();
    },
  );
});

it('sets the Korean home tab and sharing title to exactly 옥화당', async () => {
  const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'ko' }) });
  expect(metadata.title).toEqual({ absolute: '옥화당' });
  expect(metadata.openGraph).toMatchObject({ title: '옥화당', siteName: '옥화당' });
});
