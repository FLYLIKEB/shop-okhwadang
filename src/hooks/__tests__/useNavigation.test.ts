import { renderHook, waitFor } from '@testing-library/react';
import { useNavigation, clearNavCache } from '../useNavigation';

const mockGetByGroup = vi.fn();

vi.mock('@/lib/api', () => ({
  navigationApi: {
    getByGroup: (...args: unknown[]) => mockGetByGroup(...args),
  },
}));

describe('useNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearNavCache();
  });

  it('API에서 네비게이션 항목을 가져온다', async () => {
    const apiItems = [
      { id: 1, group: 'gnb', label: 'API 상품', url: '/products', sort_order: 0, is_active: true, parent_id: null, children: [] },
    ];
    mockGetByGroup.mockResolvedValue(apiItems);

    const { result } = renderHook(() => useNavigation('gnb'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual(apiItems);
    expect(mockGetByGroup).toHaveBeenCalledWith('gnb');
  });

  it('API 실패 시 정적 fallback을 반환한다', async () => {
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
    expect(result.current.items[0].label).toBe('상품목록');
  });

  it('footer 그룹을 요청할 수 있다', async () => {
    mockGetByGroup.mockResolvedValue([]);

    const { result } = renderHook(() => useNavigation('footer'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetByGroup).toHaveBeenCalledWith('footer');
    expect(result.current.items).toEqual([]);
  });
});
