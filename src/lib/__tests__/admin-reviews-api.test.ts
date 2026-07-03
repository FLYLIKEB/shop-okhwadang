import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminReviewsApi } from '@/lib/api/admin/reviews';
import { apiClient } from '@/lib/api/core';

describe('adminReviewsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads review list with boolean media filter serialized for query params', async () => {
    const response = { items: [], total: 0, page: 1, limit: 20 };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(response);

    const result = await adminReviewsApi.getList({
      page: 2,
      limit: 20,
      search: '5008298806',
      visibility: 'hidden',
      rating: 5,
      hasMedia: true,
      sort: 'helpful',
      order: 'DESC',
    });

    expect(getSpy).toHaveBeenCalledWith('/admin/reviews', {
      params: {
        page: 2,
        limit: 20,
        search: '5008298806',
        visibility: 'hidden',
        rating: 5,
        hasMedia: 'true',
        sort: 'helpful',
        order: 'DESC',
      },
    });
    expect(result).toBe(response);
  });

  it('omits params for default list requests and serializes false media filters', async () => {
    const response = { items: [], total: 0, page: 1, limit: 20 };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(response);

    await adminReviewsApi.getList();
    await adminReviewsApi.getList({ hasMedia: false });

    expect(getSpy).toHaveBeenNthCalledWith(1, '/admin/reviews', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(2, '/admin/reviews', {
      params: { hasMedia: 'false' },
    });
  });

  it('delegates detail and visibility mutations to admin review routes', async () => {
    const review = { id: 7, isVisible: false };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(review);
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ ...review, isVisible: true });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ updated: 2 });

    await adminReviewsApi.getById(7);
    await adminReviewsApi.setVisibility(7, true);
    await adminReviewsApi.bulkSetVisibility([7, 8], false);

    expect(getSpy).toHaveBeenCalledWith('/admin/reviews/7');
    expect(patchSpy).toHaveBeenCalledWith('/admin/reviews/7/visibility', { isVisible: true });
    expect(postSpy).toHaveBeenCalledWith('/admin/reviews/bulk-visibility', {
      ids: [7, 8],
      isVisible: false,
    });
  });

  it('uploads SmartStore review Excel files to preview and commit endpoints', async () => {
    const file = new File(['xlsx'], 'review.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const response = {
      importBatchId: null,
      summary: {
        totalRows: 0,
        createCount: 0,
        updateCount: 0,
        skipCount: 0,
        successCount: 0,
        failureCount: 0,
        unmatchedProductCount: 0,
        mediaFailureCount: 0,
      },
      rows: [],
    };
    const uploadSpy = vi.spyOn(apiClient, 'uploadFile').mockResolvedValue(response);

    await adminReviewsApi.previewSmartStoreImport(file);
    await adminReviewsApi.commitSmartStoreImport(file);

    expect(uploadSpy).toHaveBeenNthCalledWith(
      1,
      '/admin/reviews/imports/smartstore/preview',
      file,
    );
    expect(uploadSpy).toHaveBeenNthCalledWith(
      2,
      '/admin/reviews/imports/smartstore/commit',
      file,
    );
  });
});
