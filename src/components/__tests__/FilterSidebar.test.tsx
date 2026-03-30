import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Category } from '@/lib/api';

const mockPush = vi.fn();
let mockSearchParamsString = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

const mockCategories: Category[] = [
  { id: 1, name: '의류', slug: 'clothing', parentId: null, children: [] },
  { id: 2, name: '신발', slug: 'shoes', parentId: null, children: [] },
];

describe('FilterSidebar', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParamsString = '';
  });

  it('renders category tree and price filter', async () => {
    const { default: FilterSidebar } = await import('@/components/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} />);
    expect(screen.getByText('카테고리')).toBeInTheDocument();
    expect(screen.getByText('가격 범위')).toBeInTheDocument();
  });

  it('renders 전체 and category names', async () => {
    const { default: FilterSidebar } = await import('@/components/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} />);
    expect(screen.getAllByText('전체').length).toBeGreaterThan(0);
    expect(screen.getByText('의류')).toBeInTheDocument();
    expect(screen.getByText('신발')).toBeInTheDocument();
  });

  it('필터 초기화 button not shown when no filters active', async () => {
    const { default: FilterSidebar } = await import('@/components/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} />);
    expect(screen.queryByText('필터 초기화')).not.toBeInTheDocument();
  });

  it('필터 초기화 button shown when category filter is active', async () => {
    mockSearchParamsString = 'categoryId=1';
    const { default: FilterSidebar } = await import('@/components/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} />);
    expect(screen.getByText('필터 초기화')).toBeInTheDocument();
  });

  it('필터 초기화 clears all filter params from URL', async () => {
    mockSearchParamsString = 'categoryId=1&price_min=10000&price_max=50000';
    const { default: FilterSidebar } = await import('@/components/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} />);
    await userEvent.click(screen.getByText('필터 초기화'));
    expect(mockPush).toHaveBeenCalledWith('/products?');
  });

  it('selecting a category updates URL with categoryId', async () => {
    const { default: FilterSidebar } = await import('@/components/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} />);
    await userEvent.click(screen.getByText('신발'));
    expect(mockPush).toHaveBeenCalledWith('/products?categoryId=2');
  });

  it('mobile filter toggle button is rendered', async () => {
    const { default: FilterSidebar } = await import('@/components/filters/FilterSidebar');
    render(<FilterSidebar categories={mockCategories} />);
    expect(screen.getByText('필터 열기')).toBeInTheDocument();
  });
});
