import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminProductsApi } from '@/lib/api/admin/products';
import { apiClient } from '@/lib/api/core';
import { productsApi } from '@/lib/api/products';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('productsApi', () => {
  it('passes attrs to the product list request params', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

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

  it('calls Naver Commerce preview and commit endpoints without raw fetches', async () => {
    const response = {
      summary: { totalRows: 0, createCount: 0, updateCount: 0, skipCount: 0, successCount: 0, failureCount: 0 },
      rows: [],
    };
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(response);

    await adminProductsApi.previewNaverCommerceImport();
    await adminProductsApi.commitNaverCommerceImport();

    expect(postSpy).toHaveBeenNthCalledWith(1, '/products/imports/naver-commerce/preview');
    expect(postSpy).toHaveBeenNthCalledWith(2, '/products/imports/naver-commerce/commit');
  });
});
