import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminCouponsApi } from '@/lib/api/admin/coupons';
import { apiClient } from '@/lib/api/core';

describe('adminCouponsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('targets the admin coupon CRUD and issuance routes', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ id: 1 });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ id: 1 });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ message: 'deleted' });

    await adminCouponsApi.getList({ page: 2, limit: 20, q: 'WELCOME', status: 'active' });
    await adminCouponsApi.getById(7);
    await adminCouponsApi.create({
      code: 'WELCOME10',
      name: 'Welcome 10%',
      type: 'percentage',
      value: 10,
      minOrderAmount: 30000,
      maxDiscount: 5000,
      totalQuantity: 50,
      startsAt: '2026-07-25T00:00:00.000Z',
      expiresAt: '2026-08-25T00:00:00.000Z',
      isActive: true,
    });
    await adminCouponsApi.update(7, { isActive: false });
    await adminCouponsApi.remove(7);
    await adminCouponsApi.issue({ couponId: 7, userId: 42 });

    expect(getSpy).toHaveBeenNthCalledWith(1, '/admin/coupons', {
      params: { page: 2, limit: 20, q: 'WELCOME', status: 'active' },
    });
    expect(getSpy).toHaveBeenNthCalledWith(2, '/admin/coupons/7');
    expect(postSpy).toHaveBeenNthCalledWith(1, '/admin/coupons', expect.objectContaining({ code: 'WELCOME10' }));
    expect(patchSpy).toHaveBeenCalledWith('/admin/coupons/7', { isActive: false });
    expect(deleteSpy).toHaveBeenCalledWith('/admin/coupons/7');
    expect(postSpy).toHaveBeenNthCalledWith(2, '/admin/coupons/issue', { couponId: 7, userId: 42 });
  });
});
