'use client';

import { useTranslations } from 'next-intl';
import { useUrlModal } from '@/hooks/useUrlModal';
import { useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import SegmentedOptionGroup from '@/components/shared/ui/SegmentedOptionGroup';
import { Button } from '@/components/ui/button';
import FilterSidebar from './FilterSidebar';
import type { Category } from '@/lib/api';
import type { AttributeFilterGroup } from '@/lib/attributeFilterOptions';

interface MobileFilterBarProps {
  categories: Category[];
  filterGroups: AttributeFilterGroup[];
}

export default function MobileFilterBar({ categories, filterGroups }: MobileFilterBarProps) {
  const t = useTranslations('product.filter');
  const tCommon = useTranslations('common');
  const [filterOpen, setFilterOpen] = useUrlModal('filters');
  const { categoryId, updateQuery } = useCatalogQueryParams();
  const rootCategories = categories.filter((category) => category.parentId === null);
  const categoryItems = [
    { label: tCommon('all'), value: -1 },
    ...rootCategories.map((category) => ({ label: category.name, value: Number(category.id) })),
  ];
  const activeRootCategory = rootCategories.find((category) =>
    categoryId === Number(category.id) || category.children?.some((child) => Number(child.id) === categoryId),
  );

  return (
    <div>
      <div className="flex min-w-0 items-center gap-4">
        <SegmentedOptionGroup
          items={categoryItems}
          value={activeRootCategory ? Number(activeRootCategory.id) : -1}
          onToggle={(value) => updateQuery({ categoryId: value === -1 ? undefined : value })}
          ariaLabel={t('categoryFilterLabel')}
          className="min-w-0 flex-1 flex-nowrap gap-6 overflow-x-auto scrollbar-hide"
          itemClassName="shrink-0 px-0 font-normal uppercase"
          size="md"
          tone="text"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setFilterOpen(!filterOpen)}
          aria-expanded={filterOpen}
          aria-controls="catalog-filter-panel"
          className="shrink-0 px-0 font-normal uppercase hover:bg-transparent"
        >
          {filterOpen ? t('closeFilter') : t('openFilter')}
        </Button>
      </div>
      {filterOpen && (
        <div id="catalog-filter-panel" className="border-y border-soft py-4">
          <FilterSidebar categories={categories} filterGroups={filterGroups} inline />
        </div>
      )}
    </div>
  );
}
