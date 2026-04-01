import { ForbiddenException } from '@nestjs/common';

/**
 * 엔티티 소유권을 검증한다. userId가 일치하지 않으면 ForbiddenException을 던진다.
 * TypeORM BigInt → string 반환 이슈를 Number() 변환으로 중앙 처리.
 */
export function assertOwnership(
  entityUserId: number | string,
  currentUserId: number | string,
  message = '접근 권한이 없습니다.',
): void {
  if (Number(entityUserId) !== Number(currentUserId)) {
    throw new ForbiddenException(message);
  }
}
