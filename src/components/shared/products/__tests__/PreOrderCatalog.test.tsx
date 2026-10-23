import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductsCatalog from '../ProductsCatalog';
import PreOrderPage from '@/app/[locale]/pre-order/page';

const { fetchProducts } = vi.hoisted(() => ({ fetchProducts: vi.fn(async () => ({ items: [], total: 0, page: 2, limit: 20 })) }));
vi.mock('@/lib/api-server', () => ({ fetchProducts, fetchCategories: async () => [], fetchCatalogFilterOptions: async () => [] }));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key === 'badge' ? 'PRE-ORDER' : key }));
vi.mock('@/components/shared/EmptyState', () => ({ default: () => <p>Empty catalog</p> }));
vi.mock('@/components/shared/products/ProductGrid', () => ({ default: () => null }));
vi.mock('@/components/shared/filters/MobileFilterBar', () => ({ default: () => null }));
vi.mock('@/components/shared/products/Pagination', () => ({ default: () => null }));
vi.mock('@/components/shared/products/ProductErrorState', () => ({ default: () => null }));

describe('pre-order catalog', () => {
  it('keeps pre-order mode fixed while retaining filters and pagination', async () => {
    const page = PreOrderPage({ params: Promise.resolve({ locale: 'en' }), searchParams: Promise.resolve({ page: '2', categoryId: '4', sort: 'price_asc' }) });
    render(await ProductsCatalog(page.props));
    expect(fetchProducts).toHaveBeenCalledWith(expect.objectContaining({ isPreOrder: true, page: 2, categoryId: 4, sort: 'price_asc', locale: 'en' }));
    expect(screen.getByRole('heading', { name: 'PRE-ORDER' })).toBeInTheDocument();
  });
});
