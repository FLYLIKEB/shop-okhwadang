'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/components/ui/utils';
import CategoryTree from './CategoryTree';
import PriceRangeFilter from './PriceRangeFilter';
import ClayTypeFilter from './ClayTypeFilter';
import TeapotShapeFilter from './TeapotShapeFilter';
import type { Category, Collection } from '@/lib/api';

interface FilterSidebarProps {
  categories: Category[];
  clayCollections: Collection[];
  shapeCollections: Collection[];
}

export default function FilterSidebar({ categories, clayCollections, shapeCollections }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const categoryIdParam = searchParams.get('categoryId');
  const selectedCategoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
  const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined;
  const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined;
  const selectedClayType = searchParams.get('clayType') ?? undefined;
  const selectedShape = searchParams.get('teapotShape') ?? undefined;

  const hasActiveFilters =
    selectedCategoryId !== undefined ||
    priceMin !== undefined ||
    priceMax !== undefined ||
    selectedClayType !== undefined ||
    selectedShape !== undefined;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const handleCategorySelect = (id: number | undefined) => {
    updateParams({ categoryId: id !== undefined ? String(id) : undefined });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    updateParams({
      price_min: min !== undefined ? String(min) : undefined,
      price_max: max !== undefined ? String(max) : undefined,
    });
  };

  const handleClayTypeSelect = (value: string | undefined) => {
    updateParams({ clayType: value });
  };

  const handleShapeSelect = (value: string | undefined) => {
    updateParams({ teapotShape: value });
  };

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('categoryId');
    params.delete('price_min');
    params.delete('price_max');
    params.delete('clayType');
    params.delete('teapotShape');
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const sidebarContent = (
    <aside aria-label="상품 필터" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">필터</span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            필터 초기화
          </button>
        )}
      </div>

      <CategoryTree
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={handleCategorySelect}
      />

      <ClayTypeFilter
        collections={clayCollections}
        selected={selectedClayType}
        onSelect={handleClayTypeSelect}
      />

      <TeapotShapeFilter
        collections={shapeCollections}
        selected={selectedShape}
        onSelect={handleShapeSelect}
      />

      <PriceRangeFilter
        min={priceMin}
        max={priceMax}
        onChange={handlePriceChange}
      />
    </aside>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className={cn(
            'rounded-md border border-input bg-background px-3 py-1.5 text-sm',
            'transition-colors hover:bg-accent',
          )}
        >
          {mobileOpen ? '필터 닫기' : '필터 열기'}
        </button>
        {mobileOpen && (
          <div className="mt-4 rounded-lg border border-border bg-background p-4">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Tablet/Desktop sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>
    </>
  );
}
