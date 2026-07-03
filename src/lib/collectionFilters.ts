import type { Collection } from '@/lib/api';

const COLLECTION_FILTER_FALLBACKS: Record<string, Record<string, string>> = {
  clay_type: {
    주니: 'junni',
    단니: 'danji',
    자니: 'jani',
    자사: 'jani',
    흑니: 'heugni',
    청수니: 'cheongsu',
    청회니: 'qinghuini',
    녹니: 'nokni',
  },
  teapot_shape: {
    서시: 'seoshi',
    석표: 'seokpyo',
    주형: 'juhu',
    편평: 'bianping',
    인왕: 'inwang',
    덕종: 'deokjong',
    수평: 'supeong',
  },
};

function fallbackFilterValue(collection: Collection, attrCode: string): string {
  return COLLECTION_FILTER_FALLBACKS[attrCode]?.[collection.nameKo ?? collection.name]
    ?? COLLECTION_FILTER_FALLBACKS[attrCode]?.[collection.name]
    ?? collection.name;
}

export function getCollectionFilterValue(collection: Collection, attrCode: string): string {
  try {
    const url = new URL(collection.productUrl, 'http://localhost');
    const attrs = url.searchParams.get('attrs');
    if (!attrs) return fallbackFilterValue(collection, attrCode);

    for (const pair of attrs.split(',')) {
      const [code, value] = pair.split(':');
      if (code?.trim() === attrCode && value?.trim()) {
        return decodeURIComponent(value.trim());
      }
    }
  } catch {
    return fallbackFilterValue(collection, attrCode);
  }

  return fallbackFilterValue(collection, attrCode);
}
