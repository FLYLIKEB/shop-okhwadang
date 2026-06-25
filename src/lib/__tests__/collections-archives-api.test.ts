import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api/core';
import { adminArchivesApi } from '@/lib/api/admin/archives';
import { adminCollectionsApi } from '@/lib/api/admin/collections';

describe('admin reorder API payloads', () => {
  const orders = [
    { id: 2, sortOrder: 1 },
    { id: 1, sortOrder: 2 },
  ];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wraps collection reorder items in an orders object', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);

    await adminCollectionsApi.reorder(orders);

    expect(patchSpy).toHaveBeenCalledWith('/admin/collections/reorder', { orders });
  });

  it('wraps nilo type reorder items in an orders object', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);

    await adminArchivesApi.reorderNiloTypes(orders);

    expect(patchSpy).toHaveBeenCalledWith('/admin/archives/nilo-types/reorder', { orders });
  });

  it('wraps artist reorder items in an orders object', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined);

    await adminArchivesApi.reorderArtists(orders);

    expect(patchSpy).toHaveBeenCalledWith('/admin/archives/artists/reorder', { orders });
  });
});
