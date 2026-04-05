'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import CategoryTree from './CategoryTree';
import PriceRangeFilter from './PriceRangeFilter';
import ClayTypeFilter from './ClayTypeFilter';
import TeapotShapeFilter from './TeapotShapeFilter';
import type { Category } from '@/lib/api';
import type { ClayType } from './ClayTypeFilter';
import type { TeapotShape } from './TeapotShapeFilter';

function FilterSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        {title}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="pt-2">{children}</div>}
    </div>
  );
}

interface FilterSidebarProps {
  categories: Category[];
}

export default function FilterSidebar({ categories }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const categoryIdParam = searchParams.get('categoryId');
  const selectedCategoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
  const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined;
  const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined;
  const clayTypeParam = searchParams.get('clayType');
  const selectedClayType = clayTypeParam ? (clayTypeParam as ClayType) : undefined;
  const shapeParam = searchParams.get('shape');
  const selectedShape = shapeParam ? (shapeParam as TeapotShape) : undefined;

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

  const handleClayTypeSelect = (value: ClayType | undefined) => {
    updateParams({ clayType: value });
  };

  const handleShapeSelect = (value: TeapotShape | undefined) => {
    updateParams({ shape: value });
  };

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('categoryId');
    params.delete('price_min');
    params.delete('price_max');
    params.delete('clayType');
    params.delete('shape');
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

      <FilterSection title="카테고리" defaultOpen>
        <CategoryTree
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={handleCategorySelect}
        />
      </FilterSection>

      <FilterSection title="니료(泥料)">
        <ClayTypeFilter
          selected={selectedClayType}
          onSelect={handleClayTypeSelect}
        />
      </FilterSection>

      <FilterSection title="모양">
        <TeapotShapeFilter
          selected={selectedShape}
          onSelect={handleShapeSelect}
        />
      </FilterSection>

      <FilterSection title="가격 범위">
        <PriceRangeFilter
          min={priceMin}
          max={priceMax}
          onChange={handlePriceChange}
        />
      </FilterSection>
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
