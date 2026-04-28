'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import type { Category } from '@/lib/api';

interface CategoryFilterSidebarProps {
  categories: Category[];
}

export default function CategoryFilterSidebar({ categories }: CategoryFilterSidebarProps) {
  const t = useTranslations('product.filter');
  const tCommon = useTranslations('common');
  const { categoryId, updateQuery } = useCatalogQueryParams();

  const handleSelect = (nextCategoryId: number | undefined) => {
    updateQuery({ categoryId: nextCategoryId });
  };

  return (
    <aside aria-label={t('category')}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{t('category')}</h2>
      <ul className="flex flex-col gap-1">
        <li>
          <button
            type="button"
            onClick={() => handleSelect(undefined)}
            className={cn(
              'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
              categoryId === undefined
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {tCommon('all')}
          </button>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => handleSelect(category.id)}
              className={cn(
                'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                categoryId === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {category.name}
            </button>
            {category.children && category.children.length > 0 && (
              <ul className="ml-3 mt-1 flex flex-col gap-1">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(child.id)}
                      className={cn(
                        'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                        categoryId === child.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {child.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
