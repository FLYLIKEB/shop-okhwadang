import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HeroBannerSlider from '@/components/home/HeroBannerSlider';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CategoryNav from '@/components/home/CategoryNav';
import type { BannerSlide } from '@/components/home/HeroBannerSlider';
import type { Product, Category } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null, logout: vi.fn() }),
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn(), items: [], itemCount: 0, totalAmount: 0, isLoading: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  wishlistApi: {
    add: vi.fn(),
    remove: vi.fn(),
    getList: vi.fn(),
    check: vi.fn(),
  },
}));

// ---- embla-carousel-react mock ----
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

// ---- embla-carousel-autoplay mock ----
vi.mock('embla-carousel-autoplay', () => ({
  default: () => ({}),
}));

// ---- next/link mock ----
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ---- next/image mock ----
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

const sampleSlides: BannerSlide[] = [
  { id: 1, title: '슬라이드 1', subtitle: '부제목 1', ctaLabel: '보기', ctaUrl: '/products', bgColor: 'bg-slate-100' },
  { id: 2, title: '슬라이드 2', bgColor: 'bg-stone-100' },
  { id: 3, title: '슬라이드 3', bgColor: 'bg-zinc-100' },
];

const sampleProducts: Product[] = [
  {
    id: 1, name: '테스트 상품 1', slug: 'test-1', price: 20000, salePrice: null,
    status: 'active', isFeatured: true, viewCount: 10, category: null, images: [],
  },
  {
    id: 2, name: '테스트 상품 2', slug: 'test-2', price: 30000, salePrice: 25000,
    status: 'active', isFeatured: true, viewCount: 20, category: null, images: [],
  },
];

const sampleCategories: Category[] = [
  { id: 1, name: '상의', slug: 'top', parentId: null },
  { id: 2, name: '하의', slug: 'bottom', parentId: null },
  { id: 3, name: '아우터', slug: 'outer', parentId: null },
];

describe('HeroBannerSlider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders first slide title', () => {
    render(<HeroBannerSlider slides={sampleSlides} />);
    expect(screen.getByText('슬라이드 1')).toBeInTheDocument();
  });

  it('renders all slide titles', () => {
    render(<HeroBannerSlider slides={sampleSlides} />);
    expect(screen.getByText('슬라이드 1')).toBeInTheDocument();
    expect(screen.getByText('슬라이드 2')).toBeInTheDocument();
    expect(screen.getByText('슬라이드 3')).toBeInTheDocument();
  });

  it('renders prev/next buttons', () => {
    render(<HeroBannerSlider slides={sampleSlides} />);
    expect(screen.getByLabelText('이전 배너')).toBeInTheDocument();
    expect(screen.getByLabelText('다음 배너')).toBeInTheDocument();
  });

  it('renders nothing when slides is empty', () => {
    const { container } = render(<HeroBannerSlider slides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders CTA link when ctaLabel and ctaUrl provided', () => {
    render(<HeroBannerSlider slides={sampleSlides} />);
    const link = screen.getAllByRole('link', { name: '보기' })[0];
    expect(link).toHaveAttribute('href', '/products');
  });
});

describe('FeaturedProducts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders product cards', () => {
    render(
      <FeaturedProducts title="추천 상품" products={sampleProducts} moreHref="/products?isFeatured=true" />,
    );
    expect(screen.getByText('테스트 상품 1')).toBeInTheDocument();
    expect(screen.getByText('테스트 상품 2')).toBeInTheDocument();
  });

  it('renders skeleton cards when loading', () => {
    const { container } = render(
      <FeaturedProducts title="추천 상품" products={[]} moreHref="/products" isLoading />,
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders nothing when products empty and not loading', () => {
    const { container } = render(
      <FeaturedProducts title="추천 상품" products={[]} moreHref="/products" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "더 보기" link', () => {
    render(
      <FeaturedProducts title="추천 상품" products={sampleProducts} moreHref="/products?isFeatured=true" />,
    );
    const link = screen.getByRole('link', { name: /더 보기/ });
    expect(link).toHaveAttribute('href', '/products?isFeatured=true');
  });
});

describe('CategoryNav', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders category links', () => {
    render(<CategoryNav categories={sampleCategories} />);
    expect(screen.getByText('상의')).toBeInTheDocument();
    expect(screen.getByText('하의')).toBeInTheDocument();
    expect(screen.getByText('아우터')).toBeInTheDocument();
  });

  it('category link points to correct href', () => {
    render(<CategoryNav categories={sampleCategories} />);
    const topLink = screen.getByRole('link', { name: /상의/ });
    expect(topLink).toHaveAttribute('href', '/products?categoryId=1');
  });

  it('renders nothing when categories empty', () => {
    const { container } = render(<CategoryNav categories={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<CategoryNav categories={[]} isLoading />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
