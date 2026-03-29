import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SiteSetting } from '@/lib/api';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    settingsApi: {
      getAll: vi.fn(),
      getMap: vi.fn(),
    },
  };
});

import { settingsApi } from '@/lib/api';

const mockGetAll = settingsApi.getAll as ReturnType<typeof vi.fn>;
const mockGetMap = settingsApi.getMap as ReturnType<typeof vi.fn>;

describe('settingsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll returns settings list', async () => {
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
    mockGetAll.mockResolvedValue(mockSettings);

    const result = await settingsApi.getAll('theme');

    expect(mockGetAll).toHaveBeenCalledWith('theme');
    expect(result).toEqual(mockSettings);
  });

  it('getAll without group returns all settings', async () => {
    mockGetAll.mockResolvedValue([]);

    await settingsApi.getAll();

    expect(mockGetAll).toHaveBeenCalledWith();
  });

  it('getMap returns key-value map', async () => {
    const mockMap = {
      color_primary: '#2563eb',
      color_background: '#ffffff',
    };
    mockGetMap.mockResolvedValue(mockMap);

    const result = await settingsApi.getMap();

    expect(mockGetMap).toHaveBeenCalled();
    expect(result).toEqual(mockMap);
  });
});
