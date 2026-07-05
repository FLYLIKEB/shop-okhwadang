export const PRODUCT_LIST_CACHE_PATTERN = 'products:list:*';
export const PRODUCT_BULK_CACHE_PATTERN = 'products:bulk:*';
export const PRODUCT_DETAIL_CACHE_PATTERN = 'products:detail:*';

export function getProductListCacheKey(query: unknown, isAdmin: boolean): string {
  const hash = Buffer.from(JSON.stringify({ ...asRecord(query), isAdmin })).toString(
    'base64',
  );
  return `products:list:${hash}`;
}

export function getProductDetailCacheKey(id: number, isAdmin: boolean, locale?: string): string {
  return `products:detail:${isAdmin ? 'admin' : 'public'}:${locale ?? 'ko'}:${id}`;
}

export function getProductBulkCacheKey(ids: number[], isAdmin: boolean, locale?: string): string {
  return `products:bulk:${isAdmin ? 'admin' : 'public'}:${locale ?? 'ko'}:${[...ids].sort().join(',')}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
}
