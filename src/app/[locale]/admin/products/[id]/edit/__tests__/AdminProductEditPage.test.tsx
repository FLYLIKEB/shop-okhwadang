import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminProductEditPage from '../page';
import { adminProductsApi } from '@/lib/api';
import type { ProductDetail } from '@/lib/api';

const route = vi.hoisted(() => ({ id: '42' }));
vi.mock('next/navigation', () => ({ useParams: () => route }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  adminProductsApi: {
    getById: vi.fn(),
  },
}));

vi.mock('@/components/shared/admin/ProductFormPage', () => ({
  default: ({ product }: { product: ProductDetail }) => (
    <div data-testid="product-form" data-status={product.status}>
      {product.name}
    </div>
  ),
}));

function makeProduct(status: ProductDetail['status']): ProductDetail {
  return {
    id: 42,
    name: `${status} product`,
    slug: `${status}-product`,
    price: 10000,
    salePrice: null,
    shortDescription: null,
    description: null,
    rating: 0,
    reviewCount: 0,
    status,
    isFeatured: false,
    viewCount: 0,
    category: null,
    images: [],
    stock: 0,
    sku: null,
    noticeInfo: null,
    options: [],
    detailImages: [],
  };
}

describe('AdminProductEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.id = '42';
  });

  it('loads the new route and ignores a late response for the previous product', async () => {
    let resolveFirst!: (product: ProductDetail) => void;
    vi.mocked(adminProductsApi.getById)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ...makeProduct('active'), id: 43, name: 'New product' });
    const { rerender } = render(<AdminProductEditPage />);
    route.id = '43';
    rerender(<AdminProductEditPage />);
    expect(await screen.findByText('New product')).toBeInTheDocument();
    await act(async () => resolveFirst(makeProduct('draft')));
    expect(screen.getByText('New product')).toBeInTheDocument();
    expect(adminProductsApi.getById).toHaveBeenLastCalledWith(43);
  });

  it.each(['draft', 'hidden'] as const)(
    'loads a %s product through the protected admin product API',
    async (status) => {
      vi.mocked(adminProductsApi.getById).mockResolvedValue(makeProduct(status));

      render(<AdminProductEditPage />);

      await waitFor(() => {
        expect(adminProductsApi.getById).toHaveBeenCalledWith(42);
      });
      expect(await screen.findByTestId('product-form')).toHaveAttribute('data-status', status);
      expect(screen.getByText(`${status} product`)).toBeInTheDocument();
    },
  );
});
