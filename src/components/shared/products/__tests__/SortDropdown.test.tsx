import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SortDropdown from '@/components/shared/products/SortDropdown';

const { updateQueryMock, useCatalogQueryParamsMock } = vi.hoisted(() => ({
  updateQueryMock: vi.fn(),
  useCatalogQueryParamsMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => ({
    label: '정렬',
    latest: '최신순',
    priceAsc: '낮은 가격순',
    priceDesc: '높은 가격순',
    popular: '인기순',
  }[key] ?? key),
}));

vi.mock('@/components/shared/hooks/useCatalogQueryParams', () => ({
  useCatalogQueryParams: () => useCatalogQueryParamsMock(),
}));

describe('SortDropdown', () => {
  beforeEach(() => {
    updateQueryMock.mockReset();
    useCatalogQueryParamsMock.mockReturnValue({ sort: undefined, updateQuery: updateQueryMock });
  });

  it('defaults to latest when no sort query exists', () => {
    render(<SortDropdown />);

    expect(screen.getByLabelText('정렬')).toHaveValue('latest');
  });

  it('writes selected sort value into catalog query params', async () => {
    render(<SortDropdown />);

    await userEvent.selectOptions(screen.getByLabelText('정렬'), 'price_desc');

    expect(updateQueryMock).toHaveBeenCalledWith({ sort: 'price_desc' });
  });
});
