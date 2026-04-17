import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Category, Collection } from '@/lib/api';

const mockPush = vi.fn();
let mockSearchParamsString = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

const translations: Record<string, string> = {
  'product.filter.label': '필터',
  'product.filter.openFilter': '필터 열기',
  'product.filter.closeFilter': '필터 닫기',
  'product.filter.resetFilter': '필터 초기화',
  'product.filter.filterLabel': '상품 필터',
  'product.filter.priceRange': '가격 범위',
  'product.filter.priceMin': '최소',
  'product.filter.priceMax': '최대',
  'product.filter.clayType': '니료(泥料)',
  'product.filter.teapotShape': '모양',
  'product.filter.category': '카테고리',
  'common.all': '전체',
  'common.apply': '적용',
  'common.reset': '초기화',
};

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return translations[fullKey] ?? fullKey;
  },
}));

const mockCategories: Category[] = [
  { id: 1, name: '의류', slug: 'clothing', parentId: null, children: [] },
  { id: 2, name: '신발', slug: 'shoes', parentId: null, children: [] },
];

const mockCollections: Collection[] = [
  { id: 1, type: 'clay' as const, name: 'Sin Zhi', nameKo: '신치', color: null, description: null, imageUrl: null, productUrl: '', sortOrder: 0, isActive: true },
  { id: 2, type: 'clay' as const, name: 'Jook Jin', nameKo: '죽전', color: null, description: null, imageUrl: null, productUrl: '', sortOrder: 1, isActive: true },
];

describe('FilterSidebar', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParamsString = '';
  });

  it('renders category tree and price filter', async () => {
    const { default: FilterSidebar } = await import('@/components/shared/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} clayCollections={mockCollections} shapeCollections={mockCollections} />);
    expect(screen.getByText('카테고리')).toBeInTheDocument();
    expect(screen.getByText('가격 범위')).toBeInTheDocument();
  });

  it('renders 전체 and category names', async () => {
    const { default: FilterSidebar } = await import('@/components/shared/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} clayCollections={mockCollections} shapeCollections={mockCollections} />);
    expect(screen.getAllByText('전체').length).toBeGreaterThan(0);
    expect(screen.getByText('의류')).toBeInTheDocument();
    expect(screen.getByText('신발')).toBeInTheDocument();
  });

  it('필터 초기화 button not shown when no filters active', async () => {
    const { default: FilterSidebar } = await import('@/components/shared/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} clayCollections={mockCollections} shapeCollections={mockCollections} />);
    expect(screen.queryByText('필터 초기화')).not.toBeInTheDocument();
  });

  it('필터 초기화 button shown when category filter is active', async () => {
    mockSearchParamsString = 'categoryId=1';
    const { default: FilterSidebar } = await import('@/components/shared/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} clayCollections={mockCollections} shapeCollections={mockCollections} />);
    expect(screen.getByText('필터 초기화')).toBeInTheDocument();
  });

  it('필터 초기화 clears all filter params from URL', async () => {
    mockSearchParamsString = 'categoryId=1&price_min=10000&price_max=50000';
    const { default: FilterSidebar } = await import('@/components/shared/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} clayCollections={mockCollections} shapeCollections={mockCollections} />);
    await act(async () => {
      await userEvent.click(screen.getByText('필터 초기화'));
    });
    expect(mockPush).toHaveBeenCalledWith('/products?');
  });

  it('selecting a category updates URL with categoryId', async () => {
    const { default: FilterSidebar } = await import('@/components/shared/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} clayCollections={mockCollections} shapeCollections={mockCollections} />);
    await act(async () => {
      await userEvent.click(screen.getByText('신발'));
    });
    expect(mockPush).toHaveBeenCalledWith('/products?categoryId=2');
  });

  it('mobile filter toggle button is rendered', async () => {
    const { default: FilterSidebar } = await import('@/components/shared/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} clayCollections={mockCollections} shapeCollections={mockCollections} />);
    expect(screen.getByText('필터 열기')).toBeInTheDocument();
  });
});
