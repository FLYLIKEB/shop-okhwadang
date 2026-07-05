import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';

const replaceMock = vi.fn();
const pushMock = vi.fn();
let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/admin/products',
  useSearchParams: () => params,
}));

describe('useAdminListPage', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    pushMock.mockClear();
    params = new URLSearchParams();
  });

  it('resets page to 1 when a filter changes', () => {
    const { result } = renderHook(() => useAdminListPage({
      initialFilters: {
        status: '',
      },
    }));

    act(() => {
      result.current.setPage(4);
      result.current.setFilter('status', 'active');
    });

    expect(result.current.filters.status).toBe('active');
    expect(result.current.page).toBe(1);
  });

  it('commits trimmed keyword on submit and resets page', () => {
    const { result } = renderHook(() => useAdminListPage({
      initialFilters: {
        role: '',
      },
      initialKeyword: '',
    }));

    act(() => {
      result.current.setPage(3);
      result.current.setSearchInput('  admin@example.com  ');
    });

    act(() => {
      result.current.submitSearch();
    });

    expect(result.current.keyword).toBe('admin@example.com');
    expect(result.current.page).toBe(1);
  });

  it('initializes from URL and keeps query string in sync', () => {
    params = new URLSearchParams('status=active&q=tea&page=3');
    const { result } = renderHook(() => useAdminListPage({
      initialFilters: { status: '' },
    }));

    expect(result.current.page).toBe(3);
    expect(result.current.keyword).toBe('tea');
    expect(result.current.filters.status).toBe('active');

    act(() => {
      result.current.setFilter('status', 'hidden');
    });

    expect(pushMock).toHaveBeenCalledWith('/admin/products?status=hidden&q=tea', { scroll: false });
  });
});
