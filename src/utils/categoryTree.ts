import type { Category } from '@/lib/api';

export function selectCategoriesFromTree(
  categories: Category[],
  selectedIds: number[] = [],
): Category[] {
  if (selectedIds.length === 0) {
    return categories.filter((category) => category.parentId === null);
  }

  const byId = new Map<number, Category>();
  const visit = (items: Category[]) => {
    for (const category of items) {
      byId.set(Number(category.id), category);
      if (category.children && category.children.length > 0) {
        visit(category.children);
      }
    }
  };
  visit(categories);

  return selectedIds
    .map((id) => byId.get(Number(id)))
    .filter((category): category is Category => category !== undefined);
}
