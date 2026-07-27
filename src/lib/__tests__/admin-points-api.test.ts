import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminPointsApi } from '@/lib/api/admin/points';
import { apiClient } from '@/lib/api/core';

describe('adminPointsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('targets the admin points summary, history, and adjustment routes', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({});
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ id: 1 });

    await adminPointsApi.getUserSummary(15);
    await adminPointsApi.getUserHistory(15);
    await adminPointsApi.createAdjustment({ userId: 15, delta: -3000, reason: 'Manual correction' });

    expect(getSpy).toHaveBeenNthCalledWith(1, '/admin/points/users/15');
    expect(getSpy).toHaveBeenNthCalledWith(2, '/admin/points/users/15/history', {
      params: undefined,
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/points/adjustments', {
      userId: 15,
      delta: -3000,
      reason: 'Manual correction',
    });
  });
});
