import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminProductsApi } from '@/lib/api/admin/products';
import { apiClient } from '@/lib/api/core';
import { productsApi } from '@/lib/api/products';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('productsApi', () => {
  it('passes attrs to the product list request params', async () => {
    const getSpy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await productsApi.getList({ attrs: 'clay_type:junni', price_min: 10000 });

    expect(getSpy).toHaveBeenCalledWith('/products', {
      params: { attrs: 'clay_type:junni', price_min: 10000 },
    });
  });
});

describe('adminProductsApi', () => {
  it('loads product detail from the protected admin route', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ id: 42, status: 'hidden' });

    await adminProductsApi.getById(42);

    expect(getSpy).toHaveBeenCalledWith('/admin/products/42', {
      params: undefined,
    });
  });

  it('starts Naver Commerce jobs and returns completed results without raw fetches', async () => {
    const response = {
      summary: {
        totalRows: 0,
        createCount: 0,
        updateCount: 0,
        skipCount: 0,
        successCount: 0,
        failureCount: 0,
      },
      rows: [],
    };
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      id: 'job-1',
      type: 'preview',
      status: 'completed',
      createdAt: '2026-07-03T00:00:00.000Z',
      result: response,
    });

    await expect(adminProductsApi.previewNaverCommerceImport()).resolves.toBe(response);

    expect(postSpy).toHaveBeenCalledWith('/products/imports/naver-commerce/preview');
  });

  it('polls a pending Naver Commerce job until it completes', async () => {
    vi.useFakeTimers();
    const response = {
      summary: {
        totalRows: 1,
        createCount: 0,
        updateCount: 1,
        skipCount: 0,
        successCount: 1,
        failureCount: 0,
      },
      rows: [],
    };
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      id: 'job-2',
      type: 'commit',
      status: 'running',
      createdAt: '2026-07-03T00:00:00.000Z',
    });
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      id: 'job-2',
      type: 'commit',
      status: 'completed',
      createdAt: '2026-07-03T00:00:00.000Z',
      result: response,
    });

    const promise = adminProductsApi.commitNaverCommerceImport(['SKU-1']);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toBe(response);
    expect(postSpy).toHaveBeenCalledWith('/products/imports/naver-commerce/commit', {
      selectedIdentifiers: ['SKU-1'],
    });
    expect(getSpy).toHaveBeenCalledWith('/products/imports/naver-commerce/jobs/job-2');
    vi.useRealTimers();
  });
});
