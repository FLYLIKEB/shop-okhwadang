import { describe, expect, it, vi } from 'vitest';
import { adminInquiriesApi } from '@/lib/api/admin/inquiries';
import { apiClient } from '@/lib/api/core';

describe('admin inquiries API', () => {
  it('preserves pagination metadata and status counts from the admin inquiries response', async () => {
    const response = {
      items: [],
      total: 52,
      page: 2,
      limit: 20,
      counts: {
        pending: 52,
        answered: 8,
      },
    };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(response);

    const result = await adminInquiriesApi.getAll({
      page: 2,
      limit: 20,
      status: 'pending',
    });

    expect(getSpy).toHaveBeenCalledWith('/admin/inquiries', {
      params: {
        page: 2,
        limit: 20,
        status: 'pending',
        unread: undefined,
      },
    });
    expect(result).toEqual(response);
    expect(result.total).toBe(52);
    expect(result.counts.pending).toBe(52);
    getSpy.mockRestore();
  });
});
