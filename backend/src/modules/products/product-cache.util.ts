export const PRODUCT_LIST_CACHE_PATTERN = 'products:list:*';
export const PRODUCT_BULK_CACHE_PATTERN = 'products:bulk:*';

export function getProductListCacheKey(query: unknown, isAdmin: boolean): string {
  const hash = Buffer.from(JSON.stringify({ ...asRecord(query), isAdmin })).toString(
    'base64',
  );
  return `products:list:${hash}`;
}

export function getProductDetailCacheKey(id: number): string {
  return `products:detail:${id}`;
}

export function getProductBulkCacheKey(ids: number[], isAdmin: boolean): string {
  return `products:bulk:${isAdmin ? 'admin' : 'public'}:${[...ids].sort().join(',')}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
}
