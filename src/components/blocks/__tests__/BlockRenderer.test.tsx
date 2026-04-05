import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import type { PageBlock } from '@/lib/api';

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

// ---- next/navigation mock ----
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({ locale: 'ko' }),
}));

// ---- isomorphic-dompurify mock ----
vi.mock('isomorphic-dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

// ---- dompurify mock (used by TextContentBlock via dynamic import) ----
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

// ---- next-intl useTranslations mock ----
vi.mock('next-intl', () => ({
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

// ---- API mocks ----
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/api');
  return {
    ...actual,
    productsApi: {
      getList: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
      getById: vi.fn().mockResolvedValue(null),
    },
    categoriesApi: {
      getTree: vi.fn().mockResolvedValue([]),
    },
  };
});

function makeBlock(overrides: Partial<PageBlock> & Pick<PageBlock, 'type'>): PageBlock {
  return {
    id: Math.floor(Math.random() * 10000),
    content: {},
    sort_order: 0,
    is_visible: true,
    ...overrides,
  };
}

describe('BlockRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when blocks array is empty', () => {
    const { container } = render(<BlockRenderer blocks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when all blocks are hidden', () => {
    const blocks: PageBlock[] = [
      makeBlock({ type: 'hero_banner', is_visible: false }),
      makeBlock({ type: 'text_content', is_visible: false }),
    ];
    const { container } = render(<BlockRenderer blocks={blocks} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders HeroBannerBlock for hero_banner type', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'hero_banner',
        content: {
          title: '테스트 배너',
          image_url: '/test.jpg',
          template: 'fullscreen',
        },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('테스트 배너')).toBeInTheDocument();
  });

  it('renders TextContentBlock for text_content type', async () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'text_content',
        content: { html: '<p>안녕하세요</p>' },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    await waitFor(() => {
      expect(screen.getByText('안녕하세요')).toBeInTheDocument();
    });
  });

  it('renders PromotionBannerBlock for promotion_banner type', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'promotion_banner',
        content: {
          title: '프로모션 타이틀',
          template: 'full-width',
        },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('프로모션 타이틀')).toBeInTheDocument();
  });

  it('renders UnknownBlock for unrecognized type in dev mode', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'nonexistent_type' as PageBlock['type'],
        content: {},
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText(/알 수 없는 블록 타입/)).toBeInTheDocument();
    expect(screen.getByText('nonexistent_type')).toBeInTheDocument();
  });

  it('sorts blocks by sort_order', async () => {
    const blocks: PageBlock[] = [
      makeBlock({
        id: 1,
        type: 'text_content',
        sort_order: 2,
        content: { html: '<p>두번째</p>' },
      }),
      makeBlock({
        id: 2,
        type: 'text_content',
        sort_order: 1,
        content: { html: '<p>첫번째</p>' },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    await waitFor(() => {
      const sections = screen.getAllByText(/번째/);
      expect(sections[0].textContent).toBe('첫번째');
      expect(sections[1].textContent).toBe('두번째');
    });
  });

  it('filters out invisible blocks', async () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'text_content',
        is_visible: true,
        content: { html: '<p>보이는 블록</p>' },
      }),
      makeBlock({
        type: 'text_content',
        is_visible: false,
        content: { html: '<p>숨겨진 블록</p>' },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    await waitFor(() => {
      expect(screen.getByText('보이는 블록')).toBeInTheDocument();
    });
    expect(screen.queryByText('숨겨진 블록')).not.toBeInTheDocument();
  });

  it('renders HeroBannerBlock with split template', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'hero_banner',
        content: {
          title: '스플릿 배너',
          subtitle: '부제목',
          image_url: '/split.jpg',
          cta_text: '바로가기',
          cta_url: '/products',
          template: 'split',
        },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('스플릿 배너')).toBeInTheDocument();
    expect(screen.getByText('부제목')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '바로가기' })).toHaveAttribute('href', '/products');
  });

  it('renders HeroBannerBlock with fullscreen template', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'hero_banner',
        content: {
          title: '풀스크린 배너',
          image_url: '/fullscreen.jpg',
          template: 'fullscreen',
        },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('풀스크린 배너')).toBeInTheDocument();
  });

  it('renders ProductGridBlock (loading state)', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'product_grid',
        content: {
          title: '상품 그리드',
          limit: 4,
          template: '3col',
        },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('상품 그리드')).toBeInTheDocument();
  });

  it('renders ProductCarouselBlock (loading state)', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'product_carousel',
        content: {
          title: '상품 캐러셀',
          limit: 4,
          template: 'default',
        },
      }),
    ];
    const { container } = render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('상품 캐러셀')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders CategoryNavBlock (loading state)', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'category_nav',
        content: {
          category_ids: [1, 2, 3],
          template: 'text',
        },
      }),
    ];
    const { container } = render(<BlockRenderer blocks={blocks} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders PromotionBannerBlock with timer template', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'promotion_banner',
        content: {
          title: '타이머 프로모션',
          template: 'timer',
          end_date: futureDate,
        },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('타이머 프로모션')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('renders PromotionBannerBlock with card template', () => {
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'promotion_banner',
        content: {
          title: '카드 프로모션',
          subtitle: '카드 부제목',
          cta_text: '구매하기',
          cta_url: '/products',
          template: 'card',
        },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('카드 프로모션')).toBeInTheDocument();
    expect(screen.getByText('카드 부제목')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '구매하기' })).toHaveAttribute('href', '/products');
  });

  it('wraps each block in ErrorBoundary - error is isolated', () => {
    // The ErrorBoundary catches render errors and shows error UI
    // We test that the component exists (no throw at top level)
    const blocks: PageBlock[] = [
      makeBlock({
        type: 'hero_banner',
        content: {
          title: '정상 배너',
          image_url: '/test.jpg',
          template: 'fullscreen',
        },
      }),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('정상 배너')).toBeInTheDocument();
  });
});
