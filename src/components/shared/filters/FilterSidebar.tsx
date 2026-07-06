'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { useUrlModal } from '@/hooks/useUrlModal';
import { buildAttrs, useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import CategoryTree from './CategoryTree';
import PriceRangeFilter from './PriceRangeFilter';
import AttributeValueFilter from './AttributeValueFilter';
import FilterSection from './FilterSection';
import type { Category } from '@/lib/api';
import type { AttributeFilterGroup } from '@/lib/attributeFilterOptions';

interface FilterSidebarProps {
  categories: Category[];
  filterGroups: AttributeFilterGroup[];
}

export default function FilterSidebar({ categories, filterGroups }: FilterSidebarProps) {
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

  const selectedAttributeValues = filterGroups.map((group) => attrs.get(group.code));

  const hasActiveFilters =
    categoryId !== undefined ||
    priceMin !== undefined ||
    priceMax !== undefined ||
    selectedAttributeValues.some((value) => value !== undefined);

  const handleCategorySelect = useCallback((id: number | undefined) => {
    updateQuery({ categoryId: id });
  }, [updateQuery]);

  const handlePriceChange = useCallback((min?: number, max?: number) => {
    updateQuery({
      price_min: min,
      price_max: max,
    });
  }, [updateQuery]);

  const handleAttributeSelect = useCallback((code: string, value: string | undefined) => {
    const nextAttrs = buildAttrs(attrs, code, value);
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

      {filterGroups.map((group) => (
        <FilterSection key={group.code} title={group.label} defaultOpen={attrs.get(group.code) !== undefined}>
          <AttributeValueFilter
            code={group.code}
            options={group.options}
            selected={attrs.get(group.code)}
            onSelect={(value) => handleAttributeSelect(group.code, value)}
          />
        </FilterSection>
      ))}

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
