export const PRODUCT_LIST_CACHE_PATTERN = 'products:list:*';

export function getProductListCacheKey(query: unknown, isAdmin: boolean): string {
  const hash = Buffer.from(JSON.stringify({ ...asRecord(query), isAdmin })).toString(
    'base64',
  );
  return `products:list:${hash}`;
}

export function getProductDetailCacheKey(id: number): string {
  return `products:detail:${id}`;
}

export function getProductBulkCacheKey(ids: number[]): string {
  return `products:bulk:${[...ids].sort().join(',')}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
}
