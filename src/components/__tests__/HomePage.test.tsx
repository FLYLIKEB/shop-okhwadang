import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HeroBannerBlock from '@/components/blocks/HeroBannerBlock';
import ProductGridBlock from '@/components/blocks/ProductGridBlock';
import CategoryNavBlock from '@/components/blocks/CategoryNavBlock';
import type { HeroBannerContent, ProductGridContent, CategoryNavContent, Product, Category } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
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

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual('@/lib/api');
  return {
    ...actual,
    wishlistApi: {
      add: vi.fn(),
      remove: vi.fn(),
      getList: vi.fn(),
      check: vi.fn(),
    },
    productsApi: {
      getList: vi.fn().mockResolvedValue({ items: [] }),
      getById: vi.fn(),
    },
    categoriesApi: {
      getTree: vi.fn().mockResolvedValue([]),
    },
  };
});

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
  { id: 1, name: '상의', slug: 'top', parentId: null, description: '' },
  { id: 2, name: '하의', slug: 'bottom', parentId: null, description: '' },
  { id: 3, name: '아우터', slug: 'outer', parentId: null, description: '' },
];

describe('HeroBannerBlock (slider)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders default slides when no slides provided', () => {
    const content: HeroBannerContent = {
      title: '', image_url: '', template: 'slider',
    };
    render(<HeroBannerBlock content={content} />);
    expect(screen.getByText('의흥 장인의 손끝에서')).toBeInTheDocument();
  });

  it('renders custom slides', () => {
    const content: HeroBannerContent = {
      title: '', image_url: '', template: 'slider',
      slides: [
        { title: '슬라이드 1', subtitle: '부제목 1', cta_text: '보기', cta_url: '/products' },
        { title: '슬라이드 2' },
        { title: '슬라이드 3' },
      ],
    };
    render(<HeroBannerBlock content={content} />);
    expect(screen.getByText('슬라이드 1')).toBeInTheDocument();
    expect(screen.getByText('슬라이드 2')).toBeInTheDocument();
    expect(screen.getByText('슬라이드 3')).toBeInTheDocument();
  });

  it('renders prev/next buttons', () => {
    const content: HeroBannerContent = {
      title: '', image_url: '', template: 'slider',
    };
    render(<HeroBannerBlock content={content} />);
    expect(screen.getByLabelText('이전 배너')).toBeInTheDocument();
    expect(screen.getByLabelText('다음 배너')).toBeInTheDocument();
  });

  it('renders CTA link when provided', () => {
    const content: HeroBannerContent = {
      title: '', image_url: '', template: 'slider',
      slides: [
        { title: '슬라이드', cta_text: '보기', cta_url: '/products' },
      ],
    };
    render(<HeroBannerBlock content={content} />);
    const link = screen.getByRole('link', { name: '보기' });
    expect(link).toHaveAttribute('href', '/products');
  });
});

describe('ProductGridBlock', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders prefetched product cards', () => {
    const content: ProductGridContent = {
      title: '추천 상품', template: '4col', limit: 8,
      more_href: '/products?isFeatured=true',
      prefetched_products: sampleProducts,
    };
    render(<ProductGridBlock content={content} />);
    expect(screen.getByText('테스트 상품 1')).toBeInTheDocument();
    expect(screen.getByText('테스트 상품 2')).toBeInTheDocument();
  });

  it('renders "더 보기" link', () => {
    const content: ProductGridContent = {
      title: '추천 상품', template: '4col', limit: 8,
      more_href: '/products?isFeatured=true',
      prefetched_products: sampleProducts,
    };
    render(<ProductGridBlock content={content} />);
    const link = screen.getByRole('link', { name: /더 보기/ });
    expect(link).toHaveAttribute('href', '/products?isFeatured=true');
  });

  it('renders nothing when no products and not loading', () => {
    const content: ProductGridContent = {
      title: '추천 상품', template: '4col', limit: 8,
      prefetched_products: [],
    };
    const { container } = render(<ProductGridBlock content={content} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('CategoryNavBlock', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders prefetched category links', () => {
    const content: CategoryNavContent = {
      category_ids: [], template: 'text',
      prefetched_categories: sampleCategories,
    };
    render(<CategoryNavBlock content={content} />);
    expect(screen.getByText('상의')).toBeInTheDocument();
    expect(screen.getByText('하의')).toBeInTheDocument();
    expect(screen.getByText('아우터')).toBeInTheDocument();
  });

  it('category link points to correct href', () => {
    const content: CategoryNavContent = {
      category_ids: [], template: 'text',
      prefetched_categories: sampleCategories,
    };
    render(<CategoryNavBlock content={content} />);
    const topLink = screen.getByRole('link', { name: /상의/ });
    expect(topLink).toHaveAttribute('href', '/products?categoryId=1');
  });

  it('renders nothing when categories empty and not loading', () => {
    const content: CategoryNavContent = {
      category_ids: [], template: 'text',
      prefetched_categories: [],
    };
    const { container } = render(<CategoryNavBlock content={content} />);
    expect(container.firstChild).toBeNull();
  });
});
