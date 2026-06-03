import { describe, expect, it } from 'vitest';
import { CollectionType, type Collection } from '@/lib/api';
import { getCollectionFilterValue } from '@/lib/collectionFilters';

const baseCollection: Collection = {
  id: 1,
  type: CollectionType.CLAY,
  name: '자니',
  nameKo: null,
  color: null,
  description: null,
  imageUrl: null,
  productUrl: '/products?attrs=clay_type:jani',
  sortOrder: 0,
  isActive: true,
};

describe('getCollectionFilterValue', () => {
  it('extracts the attrs value for the requested attribute code', () => {
    expect(getCollectionFilterValue(baseCollection, 'clay_type')).toBe('jani');
  });

  it('falls back to collection.name when productUrl has no matching attrs value', () => {
    expect(getCollectionFilterValue({ ...baseCollection, productUrl: '/products?categoryId=1' }, 'clay_type')).toBe('자니');
  });
});
