import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * QueryBuilder에 skip/take를 적용하고 getManyAndCount를 실행하여 페이지네이션 결과를 반환한다.
 * 기본값: page=1, limit=20
 */
export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  pagination: { page?: number; limit?: number },
): Promise<PaginatedResult<T>> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;

  const [items, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return { items, total, page, limit };
}
