import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchInput from '@/components/shared/search/SearchInput';

const {
  pushMock,
  setOpenMock,
  addSearchMock,
  removeSearchMock,
  clearSearchesMock,
  getPopularMock,
  useAutocompleteMock,
  useRecentSearchesMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  setOpenMock: vi.fn(),
  addSearchMock: vi.fn(),
  removeSearchMock: vi.fn(),
  clearSearchesMock: vi.fn(),
  getPopularMock: vi.fn(),
  useAutocompleteMock: vi.fn(),
  useRecentSearchesMock: vi.fn(),
}));

let modalOpen = true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/hooks/useUrlModal', () => ({
  useUrlModal: () => [modalOpen, setOpenMock],
}));

vi.mock('@/components/shared/hooks/useAutocomplete', () => ({
  useAutocomplete: (query: string) => useAutocompleteMock(query),
}));

vi.mock('@/components/shared/hooks/useRecentSearches', () => ({
  useRecentSearches: () => useRecentSearchesMock(),
}));

vi.mock('@/lib/api', () => ({
  searchApi: {
    getPopular: getPopularMock,
  },
}));

describe('SearchInput', () => {
  beforeEach(() => {
    modalOpen = true;
    pushMock.mockReset();
    setOpenMock.mockReset();
    addSearchMock.mockReset();
    removeSearchMock.mockReset();
    clearSearchesMock.mockReset();
    getPopularMock.mockReset();
    getPopularMock.mockResolvedValue({ keywords: ['자사호', '찻잔'] });
    useAutocompleteMock.mockReset();
    useAutocompleteMock.mockReturnValue({ suggestions: [], isLoading: false });
    useRecentSearchesMock.mockReset();
    useRecentSearchesMock.mockReturnValue({
      recentSearches: [],
      addSearch: addSearchMock,
      removeSearch: removeSearchMock,
      clearSearches: clearSearchesMock,
    });
  });

  it('submits a trimmed query, stores it, and navigates to search', async () => {
    render(<SearchInput />);

    await userEvent.type(screen.getByLabelText('상품 검색'), '  teapot  ');
    await userEvent.keyboard('{Enter}');

    expect(addSearchMock).toHaveBeenCalledWith('teapot');
    expect(setOpenMock).toHaveBeenCalledWith(false);
    expect(pushMock).toHaveBeenCalledWith('/search?q=teapot');
  });

  it('renders autocomplete suggestions for debounced hook results and selects them', async () => {
    useAutocompleteMock.mockReturnValue({
      suggestions: [{ id: 1, name: '청자 다기', slug: 'celadon' }],
      isLoading: false,
    });

    render(<SearchInput />);

    await userEvent.type(screen.getByLabelText('상품 검색'), '청자');
    await userEvent.click(await screen.findByRole('button', { name: /청자 다기/ }));

    expect(addSearchMock).toHaveBeenCalledWith('청자 다기');
    expect(pushMock).toHaveBeenCalledWith('/search?q=%EC%B2%AD%EC%9E%90%20%EB%8B%A4%EA%B8%B0');
  });

  it('shows recent searches below two characters and supports delete/clear', async () => {
    useRecentSearchesMock.mockReturnValue({
      recentSearches: ['말차', '다완'],
      addSearch: addSearchMock,
      removeSearch: removeSearchMock,
      clearSearches: clearSearchesMock,
    });

    render(<SearchInput />);

    expect(await screen.findByText('최근 검색어')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '말차 삭제' }));
    expect(removeSearchMock).toHaveBeenCalledWith('말차');

    await userEvent.click(screen.getByRole('button', { name: '전체 삭제' }));
    expect(clearSearchesMock).toHaveBeenCalled();
  });

  it('closes on Escape and outside clicks', async () => {
    render(
      <div>
        <SearchInput />
        <button type="button">outside</button>
      </div>,
    );

    await userEvent.keyboard('{Escape}');
    expect(setOpenMock).toHaveBeenCalledWith(false);

    await userEvent.click(screen.getByRole('button', { name: 'outside' }));
    await waitFor(() => expect(setOpenMock).toHaveBeenCalledWith(false, 'replace'));
  });
});
