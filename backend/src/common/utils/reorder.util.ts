import { Repository, ObjectLiteral } from 'typeorm';

/**
 * 엔티티 목록의 정렬순서를 일괄 업데이트한다. Promise.all로 병렬 실행.
 * @param repo TypeORM Repository
 * @param items { id, sortOrder } 배열
 * @param sortField DB 컬럼명 (기본값: 'sortOrder')
 */
export async function reorderEntities<T extends ObjectLiteral>(
  repo: Repository<T>,
  items: { id: number; sortOrder: number }[],
  sortField = 'sortOrder',
): Promise<void> {
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      repo.update(id, { [sortField]: sortOrder } as any),
    ),
  );
}
