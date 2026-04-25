import { describe, it, expect } from 'vitest';
import { handleApiError } from '@/utils/error';

describe('handleApiError', () => {
  it('Error 인스턴스의 message를 반환한다', () => {
    const err = new Error('네트워크 오류');
    expect(handleApiError(err)).toBe('네트워크 오류');
  });

  it('Error가 아닌 경우 fallback을 반환한다', () => {
    expect(handleApiError('string error')).toBe('오류가 발생했습니다.');
    expect(handleApiError(null)).toBe('오류가 발생했습니다.');
    expect(handleApiError(undefined)).toBe('오류가 발생했습니다.');
    expect(handleApiError({ message: 'object error' })).toBe('오류가 발생했습니다.');
    expect(handleApiError(123)).toBe('오류가 발생했습니다.');
  });

  it('명시된 fallback 메시지를 사용한다', () => {
    expect(handleApiError('not error', '결제 실패')).toBe('결제 실패');
    expect(handleApiError(null, '주문 생성 실패')).toBe('주문 생성 실패');
  });

  it('Error 인스턴스이면 fallback이 있어도 message를 우선', () => {
    const err = new Error('실제 메시지');
    expect(handleApiError(err, '폴백 메시지')).toBe('실제 메시지');
  });

  it('Error의 message가 빈 문자열이면 빈 문자열을 그대로 반환한다', () => {
    const err = new Error('');
    expect(handleApiError(err, '폴백')).toBe('');
  });

  it('Error 서브클래스 인스턴스도 처리한다', () => {
    class CustomError extends Error {
      constructor() {
        super('커스텀 에러');
      }
    }
    expect(handleApiError(new CustomError())).toBe('커스텀 에러');
  });
});
