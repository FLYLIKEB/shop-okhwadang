import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

interface SampleForm extends Record<string, unknown> {
  name: string;
  email: string;
  age: string;
}

const validator = (form: SampleForm) => {
  const errors: Partial<Record<keyof SampleForm, string>> = {};
  if (!form.name) errors.name = '이름을 입력해주세요.';
  if (!form.email.includes('@')) errors.email = '올바른 이메일이 아닙니다.';
  if (!/^\d+$/.test(form.age)) errors.age = '숫자만 입력해주세요.';
  return errors;
};

describe('useFormValidation', () => {
  it('초기 errors는 빈 객체이다', () => {
    const { result } = renderHook(() => useFormValidation<SampleForm>(validator));
    expect(result.current.errors).toEqual({});
  });

  it('validate가 false를 반환하면 errors에 모두 채운다', () => {
    const { result } = renderHook(() => useFormValidation<SampleForm>(validator));

    let valid = true;
    act(() => {
      valid = result.current.validate({ name: '', email: 'invalid', age: 'abc' });
    });

    expect(valid).toBe(false);
    expect(result.current.errors.name).toBe('이름을 입력해주세요.');
    expect(result.current.errors.email).toBe('올바른 이메일이 아닙니다.');
    expect(result.current.errors.age).toBe('숫자만 입력해주세요.');
  });

  it('validate가 true를 반환하면 errors는 비어있다', () => {
    const { result } = renderHook(() => useFormValidation<SampleForm>(validator));

    let valid = false;
    act(() => {
      valid = result.current.validate({ name: '홍길동', email: 'a@b.com', age: '30' });
    });

    expect(valid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('clearError는 특정 필드만 제거한다', () => {
    const { result } = renderHook(() => useFormValidation<SampleForm>(validator));

    act(() => {
      result.current.validate({ name: '', email: 'invalid', age: 'abc' });
    });
    expect(Object.keys(result.current.errors)).toHaveLength(3);

    act(() => {
      result.current.clearError('email');
    });

    expect(result.current.errors.email).toBeUndefined();
    expect(result.current.errors.name).toBe('이름을 입력해주세요.');
    expect(result.current.errors.age).toBe('숫자만 입력해주세요.');
  });

  it('clearError로 존재하지 않는 필드를 지워도 안전하다', () => {
    const { result } = renderHook(() => useFormValidation<SampleForm>(validator));

    act(() => {
      result.current.validate({ name: '', email: 'a@b.com', age: '30' });
    });
    const errorsBefore = result.current.errors;

    act(() => {
      result.current.clearError('email');
    });

    // unchanged reference: setState 단축 회피 확인 (no-op)
    expect(result.current.errors).toBe(errorsBefore);
  });

  it('clearAll은 모든 errors를 비운다', () => {
    const { result } = renderHook(() => useFormValidation<SampleForm>(validator));

    act(() => {
      result.current.validate({ name: '', email: 'invalid', age: 'abc' });
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.errors).toEqual({});
  });

  it('validator를 호출 시 form 인자를 그대로 전달한다', () => {
    const spy = vi.fn(() => ({} as Partial<Record<keyof SampleForm, string>>));
    const { result } = renderHook(() => useFormValidation<SampleForm>(spy));

    const sample = { name: 'A', email: 'a@b.com', age: '30' };
    act(() => {
      result.current.validate(sample);
    });

    expect(spy).toHaveBeenCalledWith(sample);
  });
});
