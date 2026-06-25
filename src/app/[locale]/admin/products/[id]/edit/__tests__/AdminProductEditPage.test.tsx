import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminProductEditPage from '../page';
import { adminProductsApi } from '@/lib/api';
import type { ProductDetail } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '42' }),
}));

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
