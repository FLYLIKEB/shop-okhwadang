import type { NavigationItem } from '@/lib/api';

// 트리 구조의 네비게이션을 평탄화한다. 폼 모달의 상위 메뉴 선택지/카운트 계산 용도.
export function flattenItems(items: NavigationItem[]): NavigationItem[] {
  const result: NavigationItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children.length > 0) {
      result.push(...flattenItems(item.children));
    }
  }
  return result;
}
