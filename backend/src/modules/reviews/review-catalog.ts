export type ReviewCatalogSource = 'internal' | 'okhwadang' | 'smartstore' | string;

export interface ReviewCatalogPage<TItem> {
  items: TItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ReviewCatalogSourceStrategy<TItem> {
  resolveItems: () => TItem[];
}

export function isInternalReviewSource(source?: string | null): boolean {
  return source === 'internal' || source === 'okhwadang';
}

export function paginateReviewCatalog<TItem>(
  items: TItem[],
  page: number,
  limit: number,
): ReviewCatalogPage<TItem> {
  const offset = (page - 1) * limit;
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    page,
    limit,
  };
}

export function reviewCatalogSource<TEntity, TItem>(
  items: TEntity[],
  map: (entity: TEntity) => TItem,
): ReviewCatalogSourceStrategy<TItem> {
  return { resolveItems: () => items.map(map) };
}

export function buildReviewCatalog<TItem>(
  sources: Array<ReviewCatalogSourceStrategy<TItem>>,
  compare: (a: TItem, b: TItem) => number,
  page: number,
  limit: number,
): ReviewCatalogPage<TItem> {
  const merged = sources.flatMap((source) => source.resolveItems());
  const sorted = [...merged].sort(compare);
  return paginateReviewCatalog(sorted, page, limit);
}

export function compareCatalogTieBreakers(
  a: { id: number; source: string },
  b: { id: number; source: string },
): number {
  const sourceDiff = a.source.localeCompare(b.source);
  if (sourceDiff !== 0) return sourceDiff;
  return b.id - a.id;
}
