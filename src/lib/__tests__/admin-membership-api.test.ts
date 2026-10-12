import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminMembershipApi } from '@/lib/api/admin/membership';
import { apiClient } from '@/lib/api/core';

describe('adminMembershipApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads membership tiers and normalizes decimal strings', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([
      {
        id: 1,
        name: 'Gold',
        minAmount: '500000.00',
        pointRate: '2.50',
        sortOrder: 3,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    await expect(adminMembershipApi.getTiers()).resolves.toEqual([
      expect.objectContaining({ name: 'Gold', minAmount: 500000, pointRate: 2.5 }),
    ]);
    expect(getSpy).toHaveBeenCalledWith('/admin/membership-tiers');
  });
});
