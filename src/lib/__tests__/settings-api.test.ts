import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/lib/api/core';
import { settingsApi, type SiteSetting } from '@/lib/api/settings';
import { adminSettingsApi } from '@/lib/api/admin/settings';

describe('settingsApi', () => {
  it('accepts empty 204 save and reset responses without JSON parsing errors', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 204 }));
    await expect(adminSettingsApi.bulkUpdate([{ key: 'color_primary', value: '#123456' }])).resolves.toBeUndefined();
    await expect(adminSettingsApi.reset()).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenNthCalledWith(1, '/api/admin/settings', expect.objectContaining({ method: 'PUT' }));
    expect(fetchSpy).toHaveBeenNthCalledWith(2, '/api/admin/settings/reset', expect.objectContaining({ method: 'POST' }));
  });
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getAll requests the grouped settings endpoint exactly', async () => {
    const mockSettings: SiteSetting[] = [
      {
        id: 1,
        key: 'color_primary',
        value: '#2563eb',
        group: 'theme',
        label: 'Primary Color',
        inputType: 'color',
        options: null,
        defaultValue: '#2563eb',
        sortOrder: 1,
      },
    ];
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockSettings);

    const result = await settingsApi.getAll('theme');

    expect(getSpy).toHaveBeenCalledWith('/settings', { params: { group: 'theme' } });
    expect(result).toEqual(mockSettings);
  });

  it('getAll without group requests all settings without a query string', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([]);

    await settingsApi.getAll();

    expect(getSpy).toHaveBeenCalledWith('/settings', { params: undefined });
  });

  it('getMap requests the settings map endpoint exactly', async () => {
    const mockMap = {
      color_primary: '#2563eb',
      color_background: '#ffffff',
    };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockMap);

    const result = await settingsApi.getMap();

    expect(getSpy).toHaveBeenCalledWith('/settings/map');
    expect(result).toEqual(mockMap);
  });
});
