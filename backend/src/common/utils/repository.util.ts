import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

/**
 * Repository에서 엔티티를 조회하고, 없으면 NotFoundException을 던진다.
 */
export async function findOrThrow<T extends ObjectLiteral>(
  repo: Repository<T>,
  where: Record<string, unknown>,
  message: string,
  relations?: string[],
): Promise<T> {
  const entity = await repo.findOne({
    where: where as any,
    ...(relations ? { relations } : {}),
  });
  if (!entity) {
    throw new NotFoundException(message);
  }
  return entity;
}
