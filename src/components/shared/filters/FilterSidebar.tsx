'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { useUrlModal } from '@/hooks/useUrlModal';
import { buildAttrs, useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import CategoryTree from './CategoryTree';
import PriceRangeFilter from './PriceRangeFilter';
import ClayTypeFilter from './ClayTypeFilter';
import TeapotShapeFilter from './TeapotShapeFilter';
import FilterSection from './FilterSection';
import type { Category, Collection } from '@/lib/api';

interface FilterSidebarProps {
  categories: Category[];
  clayCollections: Collection[];
  shapeCollections: Collection[];
}

export default function FilterSidebar({ categories, clayCollections, shapeCollections }: FilterSidebarProps) {
  const t = useTranslations('product.filter');
  const [mobileOpen, setMobileOpen] = useUrlModal('filters');
  const {
    attrs,
    categoryId,
    priceMin,
    priceMax,
    updateQuery,
    resetQuery,
  } = useCatalogQueryParams();

  const selectedClayType = attrs.get('clay_type');
  const selectedShape = attrs.get('teapot_shape');

  const hasActiveFilters =
    categoryId !== undefined ||
    priceMin !== undefined ||
    priceMax !== undefined ||
    selectedClayType !== undefined ||
    selectedShape !== undefined;

  const handleCategorySelect = useCallback((id: number | undefined) => {
    updateQuery({ categoryId: id });
  }, [updateQuery]);

  const handlePriceChange = useCallback((min?: number, max?: number) => {
    updateQuery({
      price_min: min,
      price_max: max,
    });
  }, [updateQuery]);

  const handleClayTypeSelect = useCallback((value: string | undefined) => {
    const nextAttrs = buildAttrs(attrs, 'clay_type', value);
    updateQuery({ attrs: nextAttrs });
  }, [attrs, updateQuery]);

  const handleShapeSelect = useCallback((value: string | undefined) => {
    const nextAttrs = buildAttrs(attrs, 'teapot_shape', value);
    updateQuery({ attrs: nextAttrs });
  }, [attrs, updateQuery]);

  const handleReset = useCallback(() => {
    resetQuery(['categoryId', 'price_min', 'price_max', 'attrs']);
  }, [resetQuery]);

  const sidebarContent = (
    <aside aria-label={t('filterLabel')} className="flex flex-col">
      <div className="flex items-center justify-between py-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground">{t('label')}</span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            {t('resetFilter')}
          </button>
        )}
      </div>

      <FilterSection title={t('category')} defaultOpen={categoryId !== undefined}>
        <CategoryTree
          categories={categories}
          selectedId={categoryId}
          onSelect={handleCategorySelect}
        />
      </FilterSection>

      <FilterSection title={t('clayType')} defaultOpen={selectedClayType !== undefined}>
        <ClayTypeFilter
          collections={clayCollections}
          selected={selectedClayType}
          onSelect={handleClayTypeSelect}
        />
      </FilterSection>

      <FilterSection title={t('teapotShape')} defaultOpen={selectedShape !== undefined}>
        <TeapotShapeFilter
          collections={shapeCollections}
          selected={selectedShape}
          onSelect={handleShapeSelect}
        />
      </FilterSection>

      <FilterSection title={t('priceRange')} defaultOpen={priceMin !== undefined || priceMax !== undefined}>
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
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            'rounded-md border border-input bg-background px-3 py-1.5 text-sm',
            'transition-colors hover:bg-accent',
          )}
        >
          {mobileOpen ? t('closeFilter') : t('openFilter')}
        </button>
        {mobileOpen && (
          <div className="mt-4 rounded-lg border border-border bg-background p-4">
            {sidebarContent}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        {sidebarContent}
      </div>
    </>
  );
}
