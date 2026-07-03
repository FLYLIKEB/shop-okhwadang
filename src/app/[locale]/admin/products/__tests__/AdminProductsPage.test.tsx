import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminProductsPage from '../page';
import type { Product, SmartStoreProductImportResult } from '@/lib/api';

const mockUseAdminGuard = vi.fn();
const mockGetList = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockPreviewSmartStoreImport = vi.fn();
const mockCommitSmartStoreImport = vi.fn();
const mockPreviewNaverCommerceImport = vi.fn();
const mockCommitNaverCommerceImport = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (!values) return key;
    return `${key}:${JSON.stringify(values)}`;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({
  useAdminGuard: () => mockUseAdminGuard(),
}));

vi.mock('@/lib/api', () => ({
  adminProductsApi: {
    getList: (...args: unknown[]) => mockGetList(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    previewSmartStoreImport: (...args: unknown[]) => mockPreviewSmartStoreImport(...args),
    commitSmartStoreImport: (...args: unknown[]) => mockCommitSmartStoreImport(...args),
    previewNaverCommerceImport: (...args: unknown[]) => mockPreviewNaverCommerceImport(...args),
    commitNaverCommerceImport: (...args: unknown[]) => mockCommitNaverCommerceImport(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const product: Product = {
  id: 7,
  name: '옥화당 자사호',
  slug: 'okhwadang-pot',
  price: 50000,
  salePrice: null,
  shortDescription: null,
  rating: 0,
  reviewCount: 0,
  status: 'active',
  isFeatured: false,
  isFreeShipping: true,
  viewCount: 0,
  category: null,
  images: [],
};

const naverResult: SmartStoreProductImportResult = {
  summary: {
    totalRows: 1,
    createCount: 0,
    updateCount: 1,
    skipCount: 0,
    successCount: 0,
    failureCount: 0,
  },
  rows: [
    {
      rowNumber: 1,
      identifier: 'SKU-1',
      productName: '네이버 상품',
      action: 'update',
      status: 'valid',
      productId: 7,
      optionCount: 1,
      galleryImageCount: 2,
      detailImageCount: 0,
      price: 50000,
      salePrice: null,
      hasDiscount: false,
      isFreeShipping: true,
      hasNoticeInfo: true,
      automaticMapping: { status: 'none', attributes: [], options: [] },
      mappingWarnings: [],
      errors: [],
    },
  ],
};

describe('AdminProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminGuard.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      isLoading: false,
      isAdmin: true,
    });
    mockGetList.mockResolvedValue({ items: [product], total: 1, page: 1, limit: 20 });
    mockUpdate.mockResolvedValue(product);
    mockRemove.mockResolvedValue({ message: 'deleted' });
    mockPreviewSmartStoreImport.mockResolvedValue(naverResult);
    mockCommitSmartStoreImport.mockResolvedValue({
      ...naverResult,
      summary: { ...naverResult.summary, successCount: 1 },
      rows: [{ ...naverResult.rows[0], status: 'success' }],
    });
    mockPreviewNaverCommerceImport.mockResolvedValue(naverResult);
    mockCommitNaverCommerceImport.mockResolvedValue({
      ...naverResult,
      summary: { ...naverResult.summary, successCount: 1 },
      rows: [{ ...naverResult.rows[0], status: 'success' }],
    });
  });

  it('previews and commits Naver Commerce API updates in the shared import table', async () => {
    render(<AdminProductsPage />);

    expect(await screen.findByText('옥화당 자사호')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'naverCommerce.previewButton' }));

    await waitFor(() => {
      expect(mockPreviewNaverCommerceImport).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('SKU-1')).toBeInTheDocument();
    expect(screen.getByText('네이버 상품')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'naverCommerce.commitButton' }));

    await waitFor(() => {
      expect(mockCommitNaverCommerceImport).toHaveBeenCalledTimes(1);
    });
    expect(mockCommitSmartStoreImport).not.toHaveBeenCalled();
  });
});
