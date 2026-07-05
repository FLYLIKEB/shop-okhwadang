import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminReviewsPage from '../page';
import type { AdminReviewItem } from '@/lib/api';

const mockUseAdminGuard = vi.fn();
const mockGetList = vi.fn();
const mockSetVisibility = vi.fn();
const mockSetReply = vi.fn();
const mockBulkSetVisibility = vi.fn();
const mockPreviewSmartStoreImport = vi.fn();
const mockCommitSmartStoreImport = vi.fn();

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (!values) return key;
    return `${key}:${JSON.stringify(values)}`;
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({
  useAdminGuard: () => mockUseAdminGuard(),
}));

vi.mock('@/lib/api', () => ({
  adminReviewsApi: {
    getList: (...args: unknown[]) => mockGetList(...args),
    setVisibility: (...args: unknown[]) => mockSetVisibility(...args),
    setReply: (...args: unknown[]) => mockSetReply(...args),
    bulkSetVisibility: (...args: unknown[]) => mockBulkSetVisibility(...args),
    previewSmartStoreImport: (...args: unknown[]) => mockPreviewSmartStoreImport(...args),
    commitSmartStoreImport: (...args: unknown[]) => mockCommitSmartStoreImport(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const makeReview = (overrides: Partial<AdminReviewItem> = {}): AdminReviewItem => ({
  id: 1,
  source: 'naver-smartstore',
  externalReviewId: '5008298806',
  externalProductId: '13629303355',
  product: { id: 7, name: '옥화당 자사호', sku: 'naver-13629303355' },
  reviewType: '일반',
  rating: 5,
  content: '아주 좋아요',
  reviewerNameMasked: 'da**',
  helpfulCount: 3,
  imageUrls: ['https://cdn.example.com/review.jpg'],
  mediaCount: 1,
  mediaFailureCount: 0,
  sourceDisplayStatus: '정상',
  isVisible: true,
  isBest: false,
  reviewedAt: '2026-06-27T07:37:03.000Z',
  sourceUpdatedAt: null,
  lastSyncedAt: '2026-07-03T00:00:00.000Z',
  importBatchId: 'naver-review-1',
  orderNo: '2026062172779571',
  relatedReviewExternalId: null,
  relatedReviewContent: null,
  adminReplyContent: null,
  adminReplyAuthor: null,
  adminRepliedAt: null,
  ...overrides,
});

describe('AdminReviewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminGuard.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      isLoading: false,
      isAdmin: true,
    });
    mockGetList.mockResolvedValue({ items: [makeReview()], total: 1, page: 1, limit: 20 });
    mockSetVisibility.mockResolvedValue(makeReview({ isVisible: false }));
    mockSetReply.mockResolvedValue(
      makeReview({
        adminReplyContent: '소중한 후기 감사합니다.',
        adminReplyAuthor: '옥화당',
        adminRepliedAt: '2026-07-05T00:00:00.000Z',
      }),
    );
    mockBulkSetVisibility.mockResolvedValue({ updated: 1 });
    mockPreviewSmartStoreImport.mockResolvedValue({
      importBatchId: null,
      summary: {
        totalRows: 1,
        createCount: 1,
        updateCount: 0,
        skipCount: 0,
        successCount: 0,
        failureCount: 0,
        unmatchedProductCount: 0,
        mediaFailureCount: 0,
      },
      rows: [
        {
          rowNumber: 2,
          externalReviewId: '5008298806',
          externalProductId: '13629303355',
          externalProductKey: 'naver-13629303355',
          productName: '옥화당 자사호',
          matchedProductId: 7,
          action: 'create',
          status: 'valid',
          rating: 5,
          reviewType: '일반',
          reviewedAt: '2026-06-27T07:37:03.000Z',
          mediaCount: 1,
          mediaSuccessCount: 0,
          mediaFailureCount: 0,
          isVisible: true,
          errors: [],
          warnings: [],
        },
      ],
    });
    mockCommitSmartStoreImport.mockResolvedValue({
      importBatchId: 'naver-review-20260703-abc123',
      summary: {
        totalRows: 1,
        createCount: 1,
        updateCount: 0,
        skipCount: 0,
        successCount: 1,
        failureCount: 0,
        unmatchedProductCount: 0,
        mediaFailureCount: 0,
      },
      rows: [
        {
          rowNumber: 2,
          externalReviewId: '5008298806',
          externalProductId: '13629303355',
          externalProductKey: 'naver-13629303355',
          productName: '옥화당 자사호',
          matchedProductId: 7,
          action: 'create',
          status: 'success',
          rating: 5,
          reviewType: '일반',
          reviewedAt: '2026-06-27T07:37:03.000Z',
          mediaCount: 1,
          mediaSuccessCount: 1,
          mediaFailureCount: 0,
          isVisible: true,
          errors: [],
          warnings: [],
        },
      ],
    });
  });

  it('loads the admin review list and toggles single-review visibility', async () => {
    render(<AdminReviewsPage />);

    expect(await screen.findByText('아주 좋아요')).toBeInTheDocument();
    expect(mockGetList).toHaveBeenCalledWith({ page: 1, limit: 20, visibility: 'all' });

    fireEvent.click(screen.getByRole('button', { name: 'actions.hide' }));

    await waitFor(() => {
      expect(mockSetVisibility).toHaveBeenCalledWith(1, false, 'naver-smartstore');
    });
  });

  it('previews SmartStore review Excel upload and renders row-level results', async () => {
    render(<AdminReviewsPage />);
    await screen.findByText('아주 좋아요');

    const file = new File(['dummy'], 'review.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(screen.getByLabelText('import.fileLabel'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'import.previewButton' }));

    await waitFor(() => {
      expect(mockPreviewSmartStoreImport).toHaveBeenCalledWith(file);
    });
    expect(await screen.findByText('naver-13629303355')).toBeInTheDocument();
  });

  it('commits the previewed SmartStore review file and shows the import batch id', async () => {
    render(<AdminReviewsPage />);
    await screen.findByText('아주 좋아요');

    const file = new File(['dummy'], 'review.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(screen.getByLabelText('import.fileLabel'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'import.previewButton' }));

    await waitFor(() => {
      expect(mockPreviewSmartStoreImport).toHaveBeenCalledWith(file);
    });
    fireEvent.click(screen.getByRole('button', { name: 'import.commitButton' }));

    await waitFor(() => {
      expect(mockCommitSmartStoreImport).toHaveBeenCalledWith(file);
    });
    expect(
      await screen.findByText('import.batchId:{"id":"naver-review-20260703-abc123"}'),
    ).toBeInTheDocument();
  });

  it('applies search, rating, media, and review type filters to the list request', async () => {
    render(<AdminReviewsPage />);
    await screen.findByText('아주 좋아요');
    mockGetList.mockClear();

    fireEvent.change(screen.getByLabelText('filters.searchLabel'), {
      target: { value: '5008298806' },
    });
    fireEvent.change(screen.getByLabelText('filters.ratingLabel'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('filters.mediaLabel'), { target: { value: 'true' } });
    fireEvent.change(screen.getByLabelText('filters.reviewTypeLabel'), {
      target: { value: '일반' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'filters.searchButton' }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        visibility: 'all',
        search: '5008298806',
        rating: 5,
        hasMedia: true,
        reviewType: '일반',
      });
    });
  });

  it('renders hidden unmatched review details without media links', async () => {
    mockGetList.mockResolvedValue({
      items: [
        makeReview({
          product: null,
          content: null,
          imageUrls: null,
          mediaCount: 0,
          mediaFailureCount: 2,
          isVisible: false,
          isBest: true,
          sourceDisplayStatus: null,
          orderNo: null,
          importBatchId: null,
          reviewType: null,
          relatedReviewContent: '관련 리뷰 본문',
        }),
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<AdminReviewsPage />);

    expect(await screen.findAllByText('table.unmatchedProduct')).toHaveLength(1);
    expect(screen.getByText('status.hidden')).toBeInTheDocument();
    expect(screen.getByText('status.best')).toBeInTheDocument();
    expect(screen.getByText('table.mediaFailure:{"count":2}')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'actions.detail' }));

    expect(await screen.findByText('관련 리뷰 본문')).toBeInTheDocument();
    expect(screen.getAllByText('table.noContent')).toHaveLength(2);
  });

  it('bulk hides selected reviews through the admin API', async () => {
    render(<AdminReviewsPage />);
    await screen.findByText('아주 좋아요');

    fireEvent.click(screen.getByLabelText('table.selectOne:{"id":"5008298806"}'));
    fireEvent.click(screen.getByRole('button', { name: 'bulk.hide' }));

    await waitFor(() => {
      expect(mockBulkSetVisibility).toHaveBeenCalledWith(
        [{ id: 1, source: 'naver-smartstore' }],
        false,
      );
    });
  });

  it('saves an admin reply for the selected review with its source', async () => {
    render(<AdminReviewsPage />);
    await screen.findByText('아주 좋아요');

    fireEvent.click(screen.getByRole('button', { name: 'actions.detail' }));
    fireEvent.change(screen.getByPlaceholderText('reply.placeholder'), {
      target: { value: '소중한 후기 감사합니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'reply.save' }));

    await waitFor(() => {
      expect(mockSetReply).toHaveBeenCalledWith(
        1,
        '소중한 후기 감사합니다.',
        undefined,
        'naver-smartstore',
      );
    });
  });
});
