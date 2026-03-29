import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/useAutocomplete', () => ({
  useAutocomplete: vi.fn(() => ({ suggestions: [], isLoading: false })),
}));

vi.mock('@/hooks/useRecentSearches', () => ({
  useRecentSearches: vi.fn(() => ({
    recentSearches: ['sneakers', 'bags'],
    addSearch: vi.fn(),
    removeSearch: vi.fn(),
    clearSearches: vi.fn(),
  })),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    searchApi: {
      getPopular: vi.fn(() => Promise.resolve({ keywords: ['인기검색어1', '인기검색어2'] })),
    },
    productsApi: {
      ...actual.productsApi,
      autocomplete: vi.fn(() => Promise.resolve([])),
    },
  };
});

describe('SearchInput', () => {
  beforeEach(() => {
    mockPush.mockClear();
    localStorage.clear();
  });

  it('shows recent searches on focus when input is empty', async () => {
    const user = userEvent.setup();
    const { default: SearchInput } = await import('@/components/search/SearchInput');
    render(<SearchInput />);

    const input = screen.getByRole('searchbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: '최근 검색어' })).toBeInTheDocument();
    });
    expect(screen.getByText('sneakers')).toBeInTheDocument();
    expect(screen.getByText('bags')).toBeInTheDocument();
  });

  it('ESC key closes the dropdown', async () => {
    const user = userEvent.setup();
    const { default: SearchInput } = await import('@/components/search/SearchInput');
    render(<SearchInput />);

    const input = screen.getByRole('searchbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: '최근 검색어' })).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: '최근 검색어' })).not.toBeInTheDocument();
    });
  });

  it('shows autocomplete results when typing', async () => {
    const { useAutocomplete } = await import('@/hooks/useAutocomplete');
    const mockedUseAutocomplete = vi.mocked(useAutocomplete);
    mockedUseAutocomplete.mockReturnValue({
      suggestions: [
        { id: 1, name: '나이키 운동화', slug: 'nike-shoes' },
        { id: 2, name: '나이키 슬리퍼', slug: 'nike-slippers' },
      ],
      isLoading: false,
    });

    const user = userEvent.setup();
    const { default: SearchInput } = await import('@/components/search/SearchInput');
    render(<SearchInput />);

    const input = screen.getByRole('searchbox');
    await user.click(input);
    await user.type(input, '나이키');

    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: '자동완성 결과' })).toBeInTheDocument();
    });
    expect(screen.getByText('나이키 운동화')).toBeInTheDocument();
    expect(screen.getByText('나이키 슬리퍼')).toBeInTheDocument();
  });
});
