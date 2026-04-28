import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';

describe('useAdminListPage', () => {
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
});
