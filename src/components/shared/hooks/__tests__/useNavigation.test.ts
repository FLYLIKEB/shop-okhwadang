import { renderHook, waitFor } from '@testing-library/react';
import { useNavigation } from '../useNavigation';

const mockGetByGroup = vi.fn();
const mockUseLocale = vi.fn(() => 'ko');
const mockTranslations = {
  products: '상품목록',
  artist: '장인',
  archive: 'Archive',
};

vi.mock('next-intl', () => ({
  useLocale: () => mockUseLocale(),
  useTranslations: () => (key: keyof typeof mockTranslations) => mockTranslations[key] ?? key,
}));

vi.mock('@/lib/api', () => ({
  navigationApi: {
    getByGroup: (...args: unknown[]) => mockGetByGroup(...args),
  },
}));

describe('useNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocale.mockReturnValue('ko');
  });

  it('API에서 locale 포함 네비게이션 항목을 가져온다', async () => {
    const apiItems = [
      { id: 1, group: 'gnb', label: 'API 상품', url: '/products', sort_order: 0, is_active: true, parent_id: null, children: [] },
    ];
    mockGetByGroup.mockResolvedValue(apiItems);

    const { result } = renderHook(() => useNavigation('gnb'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual(apiItems);
    expect(mockGetByGroup).toHaveBeenCalledWith('gnb', 'ko');
  });

  it('API 실패 시 locale 기반 fallback을 반환한다', async () => {
    mockGetByGroup.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNavigation('gnb'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0].label).toBe('상품목록');
  });

  it('API가 빈 배열을 반환하면 fallback을 사용한다', async () => {
    mockGetByGroup.mockResolvedValue([]);

    const { result } = renderHook(() => useNavigation('gnb'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[1].label).toBe('장인');
  });

  it('footer 그룹을 요청할 수 있다', async () => {
    mockUseLocale.mockReturnValue('en');
    mockGetByGroup.mockResolvedValue([]);

    const { result } = renderHook(() => useNavigation('footer'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetByGroup).toHaveBeenCalledWith('footer', 'en');
    expect(result.current.items).toEqual([]);
  });
});
