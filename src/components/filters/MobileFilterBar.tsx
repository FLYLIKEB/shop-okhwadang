'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/components/ui/utils';
import PriceRangeFilter from './PriceRangeFilter';
import TeapotShapeFilter from './TeapotShapeFilter';
import type { Category } from '@/lib/api';
import type { ClayType } from './ClayTypeFilter';
import type { TeapotShape } from './TeapotShapeFilter';

const CLAY_TYPES: { value: ClayType; label: string }[] = [
  { value: '주니', label: '주니(朱泥)' },
  { value: '단니', label: '단니(段泥)' },
  { value: '자니', label: '자니(紫泥)' },
  { value: '흑니', label: '흑니(黑泥)' },
  { value: '청수니', label: '청수니(靑水泥)' },
  { value: '녹니', label: '녹니(綠泥)' },
];

interface MobileFilterBarProps {
  categories: Category[];
}

export default function MobileFilterBar({ categories }: MobileFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);

  const categoryIdParam = searchParams.get('categoryId');
  const selectedCategoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
  const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined;
  const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined;
  const clayTypeParam = searchParams.get('clayType');
  const selectedClayType = clayTypeParam ? (clayTypeParam as ClayType) : undefined;
  const shapeParam = searchParams.get('shape');
  const selectedShape = shapeParam ? (shapeParam as TeapotShape) : undefined;

  const hasActiveFilters =
    priceMin !== undefined ||
    priceMax !== undefined ||
    selectedShape !== undefined;

  const rootCategories = categories.filter((c) => c.parentId === null);

  const isRootActive = (cat: Category): boolean => {
    if (selectedCategoryId === Number(cat.id)) return true;
    return (cat.children ?? []).some((child) => Number(child.id) === selectedCategoryId);
  };

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const handleCategorySelect = (id: number | undefined) => {
    updateParams({ categoryId: id !== undefined ? String(id) : undefined });
  };

  const handleClayTypeSelect = (value: ClayType | undefined) => {
    updateParams({ clayType: value });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    updateParams({
      price_min: min !== undefined ? String(min) : undefined,
      price_max: max !== undefined ? String(max) : undefined,
    });
  };

  const handleShapeSelect = (value: TeapotShape | undefined) => {
    updateParams({ shape: value });
  };

  const handleReset = () => {
    updateParams({ price_min: undefined, price_max: undefined, shape: undefined });
    setFilterOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* 카테고리 칩 행 */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {/* 가로 스크롤 카테고리 칩 */}
        <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => handleCategorySelect(undefined)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selectedCategoryId === undefined
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground',
            )}
          >
            전체
          </button>
          {rootCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                isRootActive(cat)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 필터 버튼 */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            hasActiveFilters
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground',
          )}
        >
          {hasActiveFilters ? '필터 적용중' : '필터'}
        </button>
      </div>

      {/* 니로 칩 행 */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => handleClayTypeSelect(undefined)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            selectedClayType === undefined
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground',
          )}
        >
          전체
        </button>
        {CLAY_TYPES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() =>
              handleClayTypeSelect(selectedClayType === item.value ? undefined : item.value)
            }
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selectedClayType === item.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 바텀시트 오버레이 */}
      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setFilterOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold">필터</span>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-6">
              <TeapotShapeFilter selected={selectedShape} onSelect={handleShapeSelect} />
              <PriceRangeFilter min={priceMin} max={priceMax} onChange={handlePriceChange} />
            </div>
            <div className="mt-6 flex gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground"
                >
                  초기화
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground"
              >
                적용
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
