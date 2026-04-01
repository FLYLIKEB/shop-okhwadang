/**
 * 플랫 목록을 parent-child 트리 구조로 변환한다.
 * @param items 플랫 목록
 * @param idKey ID 필드명 (기본값: 'id')
 * @param parentKey 부모 ID 필드명 (기본값: 'parentId')
 */
export function buildTree<T extends Record<string, any>>(
  items: T[],
  idKey = 'id',
  parentKey = 'parentId',
): (T & { children: T[] })[] {
  type TreeNode = T & { children: T[] };
  const map = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const item of items) {
    map.set(Number(item[idKey]), { ...item, children: [] } as TreeNode);
  }

  for (const item of items) {
    const node = map.get(Number(item[idKey]))!;
    const parentIdValue = item[parentKey];
    if (parentIdValue === null || parentIdValue === undefined) {
      roots.push(node);
    } else {
      const parent = map.get(Number(parentIdValue));
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}
