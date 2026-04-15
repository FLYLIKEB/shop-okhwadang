import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '@/components/ko/Header';
import Footer from '@/components/ko/Footer';
import Home from '@/app/[locale]/(routes)/page';

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

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'promotion.limitedTime': 'Limited Time',
      'promotion.specialOffer': 'Special Offer',
      'promotion.eventEnded': '이벤트가 종료되었습니다',
      'promotion.days': '일',
      'promotion.hours': '시간',
      'promotion.minutes': '분',
      'promotion.seconds': '초',
    };
    return translations[key] || key;
  },
}));

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


// Next.js App Router: test individual components (no router wrapper needed)

describe('Header', () => {
  it('renders the brand name', () => {
    render(<Header />);
    expect(screen.getByRole('img', { name: '옥화당' })).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Header />);
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
    // Home is an async server component; mock fetch dependencies
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      const data = url.includes('/categories')
        ? []
        : { items: [], total: 0, page: 1, limit: 8 };
      return Promise.resolve({ ok: true, json: async () => data });
    }));
    const jsx = await Home();
    render(jsx);
    // PromotionBanner is always rendered
    expect(screen.getByText('지금 바로 쇼핑하세요')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
