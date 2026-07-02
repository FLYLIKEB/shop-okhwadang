import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/lib/api/core';
import { settingsApi, type SiteSetting } from '@/lib/api/settings';

describe('settingsApi', () => {
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

    expect(getSpy).toHaveBeenCalledWith('/settings?group=theme');
    expect(result).toEqual(mockSettings);
  });

  it('getAll without group requests all settings without a query string', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([]);

    await settingsApi.getAll();

    expect(getSpy).toHaveBeenCalledWith('/settings');
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
