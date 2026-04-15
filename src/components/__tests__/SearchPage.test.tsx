import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams('q=shoes');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
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

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockGetList = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    productsApi: {
      ...actual.productsApi,
      getList: mockGetList,
    },
  };
});

const makeProduct = (id: number, name: string) => ({
  id,
  name,
  slug: `product-${id}`,
  price: 10000,
  salePrice: null,
  status: 'active' as const,
  isFeatured: false,
  viewCount: 0,
  category: null,
  images: [],
});

describe('SearchPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams('q=shoes');
  });

  it('renders search results', async () => {
    mockGetList.mockResolvedValue({
      items: [makeProduct(1, 'Nike Shoes'), makeProduct(2, 'Adidas Shoes')],
      total: 2,
      page: 1,
      limit: 20,
    });

    const { default: SearchPage } = await import('@/components/search/SearchPage');
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Nike Shoes')).toBeInTheDocument();
      expect(screen.getByText('Adidas Shoes')).toBeInTheDocument();
    });
    expect(screen.getByText('총 2개 상품')).toBeInTheDocument();
  });

  it('shows EmptyState when no results', async () => {
    mockGetList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    const { default: SearchPage } = await import('@/components/search/SearchPage');
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
      expect(screen.getByText('다른 키워드를 시도해보세요')).toBeInTheDocument();
    });
  });

  it('sort change updates URL', async () => {
    mockGetList.mockResolvedValue({
      items: [makeProduct(1, 'Product 1')],
      total: 1,
      page: 1,
      limit: 20,
    });

    const { default: SearchPage } = await import('@/components/search/SearchPage');
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('정렬 기준');
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('sort=price_asc'));
  });

  it('shows filter options (price inputs and apply button)', async () => {
    mockGetList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    const { default: SearchPage } = await import('@/components/search/SearchPage');
    render(<SearchPage />);

    expect(screen.getByLabelText('최소 가격')).toBeInTheDocument();
    expect(screen.getByLabelText('최대 가격')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '적용' })).toBeInTheDocument();
  });
});
