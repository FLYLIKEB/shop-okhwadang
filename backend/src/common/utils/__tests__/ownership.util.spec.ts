import { ForbiddenException } from '@nestjs/common';
import { assertOwnership } from '../ownership.util';

describe('assertOwnership', () => {
  it('동일한 number 비교 시 통과', () => {
    expect(() => assertOwnership(1, 1)).not.toThrow();
  });

  it('동일한 string 비교 시 통과 (TypeORM BigInt 반환 케이스)', () => {
    expect(() => assertOwnership('123', '123')).not.toThrow();
  });

  it('string과 number 혼합 비교 시 Number() 변환으로 통과', () => {
    expect(() => assertOwnership('42', 42)).not.toThrow();
    expect(() => assertOwnership(42, '42')).not.toThrow();
  });

  it('큰 BigInt-like string도 동일하면 통과', () => {
    expect(() => assertOwnership('9007199254740991', 9007199254740991)).not.toThrow();
  });

  it('userId가 다르면 ForbiddenException 발생', () => {
    expect(() => assertOwnership(1, 2)).toThrow(ForbiddenException);
  });

  it('기본 메시지는 "접근 권한이 없습니다."', () => {
    expect(() => assertOwnership(1, 2)).toThrow('접근 권한이 없습니다.');
  });

  it('커스텀 메시지를 전달할 수 있음', () => {
    expect(() => assertOwnership(1, 2, '주문 소유자가 아닙니다.')).toThrow('주문 소유자가 아닙니다.');
  });

  it('string vs number 다른 값일 때도 ForbiddenException', () => {
    expect(() => assertOwnership('1', 2)).toThrow(ForbiddenException);
  });
});
