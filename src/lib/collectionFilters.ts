import type { Collection } from '@/lib/api';

/**
 * 컬렉션의 productUrl(`/products?attrs=clay_type:junni` 형식)에서
 * 요청한 속성 코드의 필터 값을 추출한다.
 *
 * 필터 값의 단일 소스는 DB의 `product_url` 이다.
 * 하드코딩된 한글→슬러그 폴백 매핑은 두지 않는다 (CMS/DB 가 유일한 소스).
 * attrs 가 없거나 매칭되지 않으면 `collection.name` 을 그대로 반환한다.
 */
export function getCollectionFilterValue(collection: Collection, attrCode: string): string {
  try {
    const url = new URL(collection.productUrl, 'http://localhost');
    const attrs = url.searchParams.get('attrs');
    if (!attrs) return collection.name;

    for (const pair of attrs.split(',')) {
      const [code, value] = pair.split(':');
      if (code?.trim() === attrCode && value?.trim()) {
        return decodeURIComponent(value.trim());
      }
    }
  } catch {
    return collection.name;
  }

  return collection.name;
}
