import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FilterSidebar from '@/components/shared/filters/FilterSidebar';
import { CollectionType, type Category, type Collection } from '@/lib/api';

const { updateQueryMock, resetQueryMock, useCatalogQueryParamsMock, setMobileOpenMock } = vi.hoisted(() => ({
  updateQueryMock: vi.fn(),
  resetQueryMock: vi.fn(),
  useCatalogQueryParamsMock: vi.fn(),
  setMobileOpenMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const labels: Record<string, string> = {
      filterLabel: '상품 필터',
      label: '필터',
      resetFilter: '초기화',
      category: '카테고리',
      clayType: '니료',
      teapotShape: '형태',
      priceRange: '가격대',
      closeFilter: '필터 닫기',
      openFilter: '필터 열기',
      priceMin: '최소 가격',
      priceMax: '최대 가격',
      apply: '적용',
      all: '전체',
    };
    return labels[key] ?? `${namespace}.${key}`;
  },
}));

vi.mock('@/hooks/useUrlModal', () => ({
  useUrlModal: () => [true, setMobileOpenMock],
}));

vi.mock('@/components/shared/hooks/useCatalogQueryParams', async () => {
  const actual = await vi.importActual<typeof import('@/components/shared/hooks/useCatalogQueryParams')>(
    '@/components/shared/hooks/useCatalogQueryParams',
  );
  return {
    ...actual,
    useCatalogQueryParams: () => useCatalogQueryParamsMock(),
  };
});

const categories: Category[] = [
  {
    id: 1,
    name: '다기',
    slug: 'wares',
    parentId: null,
    imageUrl: null,
    children: [
      { id: 2, name: '자사호', slug: 'teapots', parentId: 1, imageUrl: null },
    ],
  },
];

const clayCollections: Collection[] = [
  {
    id: 11,
    type: CollectionType.CLAY,
    name: '자니',
    nameKo: null,
    color: null,
    description: null,
    imageUrl: null,
    productUrl: '/products?attrs=clay_type:zini',
    isActive: true,
    sortOrder: 0,
  },
];

const shapeCollections: Collection[] = [
  {
    id: 21,
    type: CollectionType.SHAPE,
    name: '원형',
    nameKo: null,
    color: null,
    description: null,
    imageUrl: null,
    productUrl: '/products?attrs=teapot_shape:round',
    isActive: true,
    sortOrder: 0,
  },
];

describe('FilterSidebar', () => {
  beforeEach(() => {
    updateQueryMock.mockReset();
    resetQueryMock.mockReset();
    setMobileOpenMock.mockReset();
    useCatalogQueryParamsMock.mockReturnValue({
      attrs: new Map(),
      categoryId: undefined,
      priceMin: undefined,
      priceMax: undefined,
      updateQuery: updateQueryMock,
      resetQuery: resetQueryMock,
    });
  });

  it('toggles the mobile filter panel', async () => {
    render(<FilterSidebar categories={categories} clayCollections={clayCollections} shapeCollections={shapeCollections} />);

    await userEvent.click(screen.getByRole('button', { name: '필터 닫기' }));

    expect(setMobileOpenMock).toHaveBeenCalledWith(false);
  });

  it('applies category and price filters through query params', async () => {
    render(<FilterSidebar categories={categories} clayCollections={clayCollections} shapeCollections={shapeCollections} />);

    const filterRegions = screen.getAllByLabelText('상품 필터');
    await userEvent.click(within(filterRegions[0]).getByRole('button', { name: /다기/ }));
    expect(updateQueryMock).toHaveBeenCalledWith({ categoryId: 1 });

    await userEvent.clear(screen.getAllByLabelText('최소 가격')[0]);
    await userEvent.type(screen.getAllByLabelText('최소 가격')[0], '30000');
    await userEvent.clear(screen.getAllByLabelText('최대 가격')[0]);
    await userEvent.type(screen.getAllByLabelText('최대 가격')[0], '10000');
    await userEvent.click(screen.getAllByRole('button', { name: '적용' })[0]);

    expect(updateQueryMock).toHaveBeenCalledWith({ price_min: 10000, price_max: 30000 });
  });

  it('builds attrs for clay and shape filters and can reset active filters', async () => {
    useCatalogQueryParamsMock.mockReturnValue({
      attrs: new Map([['clay_type', '자니']]),
      categoryId: 1,
      priceMin: 10000,
      priceMax: undefined,
      updateQuery: updateQueryMock,
      resetQuery: resetQueryMock,
    });

    render(<FilterSidebar categories={categories} clayCollections={clayCollections} shapeCollections={shapeCollections} />);

    await userEvent.click(screen.getAllByRole('button', { name: '자니' })[0]);
    expect(updateQueryMock).toHaveBeenCalledWith({ attrs: undefined });

    await userEvent.click(screen.getAllByRole('radio', { name: '원형' })[0]);
    expect(updateQueryMock).toHaveBeenCalledWith({ attrs: 'clay_type:자니,teapot_shape:원형' });

    await userEvent.click(screen.getAllByRole('button', { name: '초기화' })[0]);
    expect(resetQueryMock).toHaveBeenCalledWith(['categoryId', 'price_min', 'price_max', 'attrs']);
  });
});
