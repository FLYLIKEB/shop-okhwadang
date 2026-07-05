import type { Collection } from '@/lib/api';

function fallbackFilterValue(collection: Collection): string {
  return collection.name;
}

export function getCollectionFilterValue(collection: Collection, attrCode: string): string {
  try {
    const url = new URL(collection.productUrl, 'http://localhost');
    const attrs = url.searchParams.get('attrs');
    if (!attrs) return fallbackFilterValue(collection);

    for (const pair of attrs.split(',')) {
      const [code, value] = pair.split(':');
      if (code?.trim() === attrCode && value?.trim()) {
        return decodeURIComponent(value.trim());
      }
    }
  } catch {
    return fallbackFilterValue(collection);
  }

  return fallbackFilterValue(collection);
}
