import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductFormPage from '../ProductFormPage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  adminProductsApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
  uploadApi: {
    uploadImage: vi.fn(),
  },
}));

describe('ProductFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create 모드', () => {
    it('필수 필드 미입력 시 submit 차단 — name', async () => {
      const { adminProductsApi } = await import('@/lib/api');
      render(<ProductFormPage mode="create" />);

      // name 비어있고 price 입력 후 submit
      fireEvent.change(screen.getByPlaceholderText('url-friendly-slug'), {
        target: { value: 'test-slug' },
      });
      const priceInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(priceInput, { target: { value: '10000' } });

      fireEvent.click(screen.getByText('등록하기'));

      await waitFor(() => {
        expect(adminProductsApi.create).not.toHaveBeenCalled();
      });
    });

    it('필수 필드 미입력 시 submit 차단 — price 없음', async () => {
      const { adminProductsApi } = await import('@/lib/api');
      render(<ProductFormPage mode="create" />);

      fireEvent.change(screen.getByPlaceholderText('상품명을 입력하세요'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.change(screen.getByPlaceholderText('url-friendly-slug'), {
        target: { value: 'test-slug' },
      });

      fireEvent.click(screen.getByText('등록하기'));

      await waitFor(() => {
        expect(adminProductsApi.create).not.toHaveBeenCalled();
      });
    });

    it('유효한 입력 시 create API 호출', async () => {
      const { adminProductsApi } = await import('@/lib/api');
      vi.mocked(adminProductsApi.create).mockResolvedValue({
        id: 1,
        name: '테스트 상품',
        slug: 'test-product',
        price: 10000,
        salePrice: null,
        status: 'draft',
        isFeatured: false,
        viewCount: 0,
        category: null,
        images: [],
        description: null,
        shortDescription: null,
        rating: 0,
        reviewCount: 0,
        stock: 0,
        sku: null,
        options: [],
        detailImages: [],
      });

      render(<ProductFormPage mode="create" />);

      fireEvent.change(screen.getByPlaceholderText('상품명을 입력하세요'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.change(screen.getByPlaceholderText('url-friendly-slug'), {
        target: { value: 'test-product' },
      });
      // price input
      const priceInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(priceInput, { target: { value: '10000' } });

      fireEvent.click(screen.getByText('등록하기'));

      await waitFor(() => {
        expect(adminProductsApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: '테스트 상품',
            slug: 'test-product',
            price: 10000,
          }),
        );
      });
    });
  });
});
