import { describe, expect, it, vi } from 'vitest';
import { adminProductsApi } from '@/lib/api/admin/products';
import { apiClient } from '@/lib/api/core';
import { productsApi } from '@/lib/api/products';

describe('productsApi', () => {
  it('passes attrs to the product list request params', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await productsApi.getList({ attrs: 'clay_type:junni', price_min: 10000 });

    expect(getSpy).toHaveBeenCalledWith('/products', {
      params: { attrs: 'clay_type:junni', price_min: 10000 },
    });
    getSpy.mockRestore();
  });
});

describe('adminProductsApi', () => {
  it('loads product detail from the protected admin route', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ id: 42, status: 'hidden' });

    await adminProductsApi.getById(42);

    expect(getSpy).toHaveBeenCalledWith('/admin/products/42', {
      params: undefined,
    });
    getSpy.mockRestore();
  });
});
