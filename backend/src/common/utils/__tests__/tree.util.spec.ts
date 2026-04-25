import { buildTree } from '../tree.util';

interface Category {
  id: number;
  parentId: number | null;
  name: string;
}

describe('buildTree', () => {
  it('parentId가 null인 항목들은 루트로 분류', () => {
    const items: Category[] = [
      { id: 1, parentId: null, name: 'A' },
      { id: 2, parentId: null, name: 'B' },
    ];

    const result = buildTree(items);

    expect(result).toHaveLength(2);
    expect(result[0].children).toEqual([]);
    expect(result[1].children).toEqual([]);
  });

  it('parent-child 관계를 children 배열로 구성', () => {
    const items: Category[] = [
      { id: 1, parentId: null, name: '루트' },
      { id: 2, parentId: 1, name: '자식1' },
      { id: 3, parentId: 1, name: '자식2' },
    ];

    const result = buildTree(items);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children.map((c) => c.id).sort()).toEqual([2, 3]);
  });

  it('다단계 계층 구조 (손자까지)', () => {
    const items: Category[] = [
      { id: 1, parentId: null, name: '루트' },
      { id: 2, parentId: 1, name: '자식' },
      { id: 3, parentId: 2, name: '손자' },
    ];

    const result = buildTree(items);

    expect(result).toHaveLength(1);
    const child = result[0].children[0] as Category & { children: Category[] };
    expect(child.id).toBe(2);
    expect(child.children).toHaveLength(1);
    expect((child.children[0] as Category).id).toBe(3);
  });

  it('parentId가 존재하지 않는 항목은 루트로 분류 (orphan)', () => {
    const items: Category[] = [
      { id: 1, parentId: null, name: '루트' },
      { id: 2, parentId: 999, name: 'orphan' },
    ];

    const result = buildTree(items);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id).sort()).toEqual([1, 2]);
  });

  it('빈 배열 입력 시 빈 배열 반환', () => {
    expect(buildTree<Category>([])).toEqual([]);
  });

  it('id/parentId가 string이어도 Number() 변환 후 매칭 (BigInt-like)', () => {
    interface StrCategory {
      id: string;
      parentId: string | null;
      name: string;
    }
    const items: StrCategory[] = [
      { id: '1', parentId: null, name: 'A' },
      { id: '2', parentId: '1', name: 'B' },
    ];

    const result = buildTree(items);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('2');
  });

  it('커스텀 idKey/parentKey 지원', () => {
    interface CustomNode {
      pk: number;
      parent: number | null;
      label: string;
    }
    const items: CustomNode[] = [
      { pk: 1, parent: null, label: 'root' },
      { pk: 2, parent: 1, label: 'child' },
    ];

    const result = buildTree(items, 'pk', 'parent');

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].pk).toBe(2);
  });

  it('원본 객체를 mutate하지 않음 (스프레드 복사)', () => {
    const items: Category[] = [
      { id: 1, parentId: null, name: '루트' },
      { id: 2, parentId: 1, name: '자식' },
    ];

    buildTree(items);

    expect(items[0]).not.toHaveProperty('children');
    expect(items[1]).not.toHaveProperty('children');
  });
});
