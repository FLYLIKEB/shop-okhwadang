import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminCouponRulesApi } from '@/lib/api/admin/coupon-rules';
import { apiClient } from '@/lib/api/core';

describe('adminCouponRulesApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('targets the admin coupon rules CRUD routes', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ id: 1 });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ id: 1 });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ message: 'deleted' });

    await adminCouponRulesApi.getList({ page: 2, limit: 20 });
    await adminCouponRulesApi.getById(9);
    await adminCouponRulesApi.create({
      trigger: 'tier_up',
      couponTemplateId: 7,
      conditionsJson: { minTier: 'Silver' },
      active: true,
    });
    await adminCouponRulesApi.update(9, { active: false });
    await adminCouponRulesApi.remove(9);

    expect(getSpy).toHaveBeenNthCalledWith(1, '/admin/coupon-rules', { params: { page: 2, limit: 20 } });
    expect(getSpy).toHaveBeenNthCalledWith(2, '/admin/coupon-rules/9');
    expect(postSpy).toHaveBeenCalledWith('/admin/coupon-rules', {
      trigger: 'tier_up',
      couponTemplateId: 7,
      conditionsJson: { minTier: 'Silver' },
      active: true,
    });
    expect(patchSpy).toHaveBeenCalledWith('/admin/coupon-rules/9', { active: false });
    expect(deleteSpy).toHaveBeenCalledWith('/admin/coupon-rules/9');
  });
});
