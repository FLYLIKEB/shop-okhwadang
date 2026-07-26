import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductFormPage from '../ProductFormPage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => (key === 'freeShippingProduct' ? '무료배송 상품' : key),
}));

vi.mock('@/lib/api', () => ({
  adminProductsApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
  adminCategoriesApi: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  attributesApi: {
    getTypes: vi.fn().mockResolvedValue([]),
    getTypeValues: vi.fn().mockResolvedValue([]),
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
        noticeInfo: null,
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

    it('기존 속성 값을 태그처럼 선택해서 상품 속성 payload에 포함한다', async () => {
      const { adminProductsApi, attributesApi } = await import('@/lib/api');
      vi.mocked(attributesApi.getTypes).mockResolvedValue([
        {
          id: 1,
          code: 'clay_type',
          name: '니료',
          nameKo: '니료',
          nameEn: 'Clay type',
          inputType: 'select',
          isFilterable: true,
          isSearchable: true,
          validValues: ['hongni', 'zhuni'],
          parentId: null,
          relatedTypeIds: null,
          sortOrder: 0,
          isActive: true,
        },
      ]);
      vi.mocked(attributesApi.getTypeValues).mockResolvedValue([
        { value: 'zhuni', displayValue: '주니' },
        { value: 'duanni', displayValue: '단니' },
      ]);
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
        noticeInfo: null,
      });

      render(<ProductFormPage mode="create" />);

      await waitFor(() => expect(attributesApi.getTypeValues).toHaveBeenCalledWith('clay_type'));
      fireEvent.click(screen.getByText('+ 속성 추가'));
      fireEvent.change(screen.getByDisplayValue('선택'), { target: { value: '1' } });
      expect(screen.getByText('주니 (zhuni)')).toBeInTheDocument();
      fireEvent.click(screen.getByText('단니 (duanni)'));

      fireEvent.change(screen.getByPlaceholderText('상품명을 입력하세요'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.change(screen.getByPlaceholderText('url-friendly-slug'), {
        target: { value: 'test-product' },
      });
      fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '10000' } });
      fireEvent.click(screen.getByText('등록하기'));

      await waitFor(() => expect(adminProductsApi.create).toHaveBeenCalled());
      expect(adminProductsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: [
            {
              attributeTypeId: 1,
              value: 'duanni',
              displayValue: '단니',
              sortOrder: 0,
            },
          ],
        }),
      );
    });

    it('무료배송 상품 체크 시 create payload에 isFreeShipping=true를 포함한다', async () => {
      const { adminProductsApi } = await import('@/lib/api');
      vi.mocked(adminProductsApi.create).mockResolvedValue({
        id: 1,
        name: '테스트 상품',
        slug: 'test-product',
        price: 10000,
        salePrice: null,
        status: 'draft',
        isFeatured: false,
        isFreeShipping: true,
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
        noticeInfo: null,
      });

      render(<ProductFormPage mode="create" />);

      fireEvent.change(screen.getByPlaceholderText('상품명을 입력하세요'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.change(screen.getByPlaceholderText('url-friendly-slug'), {
        target: { value: 'test-product' },
      });
      fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '10000' } });
      const freeShippingCheckbox = screen.getByLabelText('무료배송 상품') as HTMLInputElement;
      fireEvent.click(freeShippingCheckbox);
      expect(freeShippingCheckbox.checked).toBe(true);
      fireEvent.click(screen.getByText('등록하기'));

      await waitFor(() => {
        expect(adminProductsApi.create).toHaveBeenCalledWith(
          expect.objectContaining({ isFreeShipping: true }),
        );
      });
    });

    it('상품고시정보 입력 시 빈 값은 제외하고 noticeInfo를 전송한다', async () => {
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
        noticeInfo: null,
      });

      render(<ProductFormPage mode="create" />);

      fireEvent.change(screen.getByPlaceholderText('상품명을 입력하세요'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.change(screen.getByPlaceholderText('url-friendly-slug'), {
        target: { value: 'test-product' },
      });
      fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '10000' } });
      fireEvent.change(screen.getAllByDisplayValue('선택 안 함')[1], { target: { value: 'tea' } });
      fireEvent.change(screen.getByPlaceholderText('침출차'), { target: { value: '잎차' } });
      fireEvent.change(screen.getByPlaceholderText('직사광선을 피하고 서늘한 곳에 보관'), {
        target: { value: '냉암소 보관' },
      });

      fireEvent.click(screen.getByText('등록하기'));

      await waitFor(() => expect(adminProductsApi.create).toHaveBeenCalled());
      expect(adminProductsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          noticeInfo: {
            type: 'tea',
            foodType: '잎차',
            storageMethod: '냉암소 보관',
          },
        }),
      );
    });

    it('다국어 입력은 영어만 노출하고 ja/zh 필드를 전송하지 않는다', async () => {
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
        noticeInfo: null,
      });

      render(<ProductFormPage mode="create" />);

      expect(screen.getByText('상품명 (영어)')).toBeInTheDocument();
      expect(screen.queryByText('상품명 (일본어)')).not.toBeInTheDocument();
      expect(screen.queryByText('상품명 (중국어)')).not.toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('상품명을 입력하세요'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.change(screen.getByPlaceholderText('url-friendly-slug'), {
        target: { value: 'test-product' },
      });
      fireEvent.change(screen.getByPlaceholderText('Product name in English'), {
        target: { value: 'Test product' },
      });
      fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '10000' } });

      fireEvent.click(screen.getByText('등록하기'));

      await waitFor(() => expect(adminProductsApi.create).toHaveBeenCalled());
      const payload = vi.mocked(adminProductsApi.create).mock.calls[0][0] as unknown as Record<
        string,
        unknown
      >;
      expect(payload.nameEn).toBe('Test product');
      expect(payload).not.toHaveProperty('nameJa');
      expect(payload).not.toHaveProperty('nameZh');
      expect(payload).not.toHaveProperty('descriptionJa');
      expect(payload).not.toHaveProperty('descriptionZh');
    });

    it('수정 모드에서 기존 상품속성을 입력값으로 표시한다', async () => {
      const { attributesApi } = await import('@/lib/api');
      vi.mocked(attributesApi.getTypes).mockResolvedValue([
        {
          id: 1,
          code: 'clay_type',
          name: '니료',
          nameKo: '니료',
          nameEn: 'Clay type',
          inputType: 'select',
          isFilterable: true,
          isSearchable: true,
          validValues: ['old_duanni'],
          parentId: null,
          relatedTypeIds: null,
          sortOrder: 0,
          isActive: true,
        },
      ]);

      render(
        <ProductFormPage
          mode="edit"
          product={{
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
            noticeInfo: null,
            attributes: [
              {
                id: 11,
                attributeTypeId: 1,
                value: 'old_duanni',
                displayValue: '노단니',
                sortOrder: 0,
              },
            ],
          }}
        />,
      );

      expect(await screen.findByDisplayValue('old_duanni')).toBeInTheDocument();
      expect(screen.getByDisplayValue('노단니')).toBeInTheDocument();
    });
    it('수정 모드에서 기존 상품고시정보를 모두 비우면 noticeInfo=null을 전송한다', async () => {
      const { adminProductsApi } = await import('@/lib/api');
      vi.mocked(adminProductsApi.update).mockResolvedValue({
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
        noticeInfo: null,
      });

      render(
        <ProductFormPage
          mode="edit"
          product={{
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
            noticeInfo: {
              type: 'tea',
              foodType: '침출차',
              storageMethod: '서늘한 곳 보관',
            },
          }}
        />,
      );

      fireEvent.change(screen.getByDisplayValue('침출차'), { target: { value: '' } });
      fireEvent.change(screen.getByDisplayValue('서늘한 곳 보관'), { target: { value: '' } });
      fireEvent.change(screen.getByDisplayValue('차류/식품류'), { target: { value: '' } });
      fireEvent.click(screen.getByText('수정하기'));

      await waitFor(() => expect(adminProductsApi.update).toHaveBeenCalled());
      expect(adminProductsApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ noticeInfo: null }),
      );
    });
  });
});
