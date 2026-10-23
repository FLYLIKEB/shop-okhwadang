import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
const mockLocaleAwarePush = vi.fn();

vi.mock('@/hooks/useUrlModal', async () => {
  const { useState } = await import('react');
  return { useUrlModal: () => useState(false) };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/products',
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockLocaleAwarePush }),
}));

const translations: Record<string, string> = {
  'product.view.grid': '그리드 보기',
  'product.view.list': '리스트 보기',
  'product.sort.label': '정렬 기준',
  'product.sort.latest': '최신순',
  'product.sort.priceAsc': '가격낮은순',
  'product.sort.priceDesc': '가격높은순',
  'product.sort.popular': '인기순',
  'product.totalItems': '총 {count}개 상품',
  'product.filter.categoryFilterLabel': '카테고리 필터',
  'product.filter.openFilter': '필터 열기',
  'product.filter.closeFilter': '필터 닫기',
  'product.filter.filterLabel': '상품 필터',
  'product.filter.category': '카테고리',
  'common.pagination.nav': '페이지네이션',
  'common.pagination.prev': '이전',
  'common.pagination.next': '다음',
  'common.pagination.pageNumber': '페이지',
};

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const t = (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const template = translations[fullKey] ?? fullKey;
      if (!values) return template;
      return Object.entries(values).reduce(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        template,
      );
    };
    t.rich = (key: string, values?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const template = translations[fullKey] ?? fullKey;
      if (!values) return template;
      return Object.entries(values).reduce<string>(
        (acc, [k, v]) => typeof v === 'function' ? acc.replace(`<${k}>`, '').replace(`</${k}>`, '') : acc.replace(`{${k}}`, String(v)),
        template,
      );
    };
    return t;
  },
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ViewToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to grid view and switches to list on click', async () => {
    const { default: ViewToggle } = await import('@/components/shared/products/ViewToggle');
    const onChange = vi.fn();
    render(<ViewToggle value="grid" onChange={onChange} />);

    const listButton = screen.getByLabelText('리스트 보기');
    await userEvent.click(listButton);

    expect(onChange).toHaveBeenCalledWith('list');
    expect(localStorage.getItem('products-view-mode')).toBe('list');
  });
});

describe('SortDropdown', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('updates URL with sort parameter on change', async () => {
    const { default: SortDropdown } = await import('@/components/shared/products/SortDropdown');
    render(<SortDropdown />);

    const select = screen.getByLabelText('정렬 기준');
    fireEvent.change(select, { target: { value: 'price_asc' } });

    expect(mockPush).toHaveBeenCalledWith('/products?sort=price_asc');
  });
});

describe('Pagination', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockLocaleAwarePush.mockClear();
  });

  it('renders page buttons and navigates on click', async () => {
    const { default: Pagination } = await import('@/components/shared/products/Pagination');
    render(<Pagination total={100} page={1} limit={20} />);

    const nextButton = screen.getByText('다음');
    await userEvent.click(nextButton);

    expect(mockLocaleAwarePush).toHaveBeenCalledWith('/products?page=2');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('uses locale-aware router for English pagination links', async () => {
    const { default: Pagination } = await import('@/components/shared/products/Pagination');
    render(<Pagination total={100} page={1} limit={20} />);

    await userEvent.click(screen.getByText('다음'));

    expect(mockLocaleAwarePush).toHaveBeenCalledWith('/products?page=2');
  });

  it('disables prev button on first page', async () => {
    const { default: Pagination } = await import('@/components/shared/products/Pagination');
    render(<Pagination total={100} page={1} limit={20} />);

    const prevButton = screen.getByText('이전');
    expect(prevButton).toBeDisabled();
  });

  it('does not render when total fits in one page', async () => {
    const { default: Pagination } = await import('@/components/shared/products/Pagination');
    const { container } = render(<Pagination total={10} page={1} limit={20} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('MobileFilterBar', () => {
  it('renders plain category navigation without a card surface', async () => {
    const { default: MobileFilterBar } = await import('@/components/shared/filters/MobileFilterBar');

    render(<MobileFilterBar categories={[{ id: 1, name: '다구', parentId: null, children: [] } as never]} filterGroups={[]} />);

    const categoryGroup = screen.getByRole('group', { name: '카테고리 필터' });
    expect(categoryGroup).toBeInTheDocument();
    expect(categoryGroup.closest('.rounded-2xl')).toBeNull();
    expect(screen.getByRole('button', { name: '필터 열기' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens one shared filter panel and preserves category query navigation', async () => {
    const { default: MobileFilterBar } = await import('@/components/shared/filters/MobileFilterBar');
    render(<MobileFilterBar categories={[{ id: 1, name: 'Teapots', slug: 'teapots', description: null, imageUrl: null, parentId: null, children: [] }]} filterGroups={[]} />);
    await userEvent.click(screen.getByRole('button', { name: '필터 열기' }));
    const panel = screen.getByRole('complementary', { name: '상품 필터' });
    expect(panel).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: '카테고리' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Teapots' }));
    expect(mockPush).toHaveBeenCalledWith('/products?categoryId=1');
    await userEvent.click(screen.getByRole('button', { name: '필터 닫기' }));
    expect(screen.queryByRole('complementary', { name: '상품 필터' })).toBeNull();
  });
});
