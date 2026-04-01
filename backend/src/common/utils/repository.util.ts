import { Repository, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

/**
 * Repository에서 엔티티를 ID로 조회하고, 없으면 NotFoundException을 던진다.
 */
export async function findOrThrow<T extends ObjectLiteral>(
  repo: Repository<T>,
  where: FindOptionsWhere<T>,
  message: string,
  relations?: string[],
): Promise<T> {
  const entity = await repo.findOne({
    where,
    ...(relations ? { relations } : {}),
  });
  if (!entity) {
    throw new NotFoundException(message);
  }
  return entity;
}
