import { describe, it, expect } from 'vitest';
import {
  isValidPhone,
  isValidZipcode,
  isValidEmail,
  isValidPassword,
} from '@/lib/validators';

describe('isValidPhone', () => {
  it('010-1234-5678 형식을 허용한다', () => {
    expect(isValidPhone('010-1234-5678')).toBe(true);
  });

  it('011/016/017/018/019 도 허용한다', () => {
    expect(isValidPhone('011-123-4567')).toBe(true);
    expect(isValidPhone('016-1234-5678')).toBe(true);
    expect(isValidPhone('019-9999-0000')).toBe(true);
  });

  it('가운데 자리가 3자리도 허용된다', () => {
    expect(isValidPhone('010-123-4567')).toBe(true);
  });

  it('하이픈이 없으면 거부', () => {
    expect(isValidPhone('01012345678')).toBe(false);
  });

  it('숫자가 아닌 문자는 거부', () => {
    expect(isValidPhone('010-abcd-5678')).toBe(false);
  });

  it('자릿수가 부족하면 거부', () => {
    expect(isValidPhone('010-123-456')).toBe(false);
    expect(isValidPhone('010-12-3456')).toBe(false);
  });

  it('국제 번호 형식은 거부', () => {
    expect(isValidPhone('+82-10-1234-5678')).toBe(false);
  });

  it('빈 문자열은 거부', () => {
    expect(isValidPhone('')).toBe(false);
  });
});

describe('isValidZipcode', () => {
  it('5자리 숫자를 허용한다', () => {
    expect(isValidZipcode('12345')).toBe(true);
    expect(isValidZipcode('00000')).toBe(true);
  });

  it('4자리 또는 6자리는 거부', () => {
    expect(isValidZipcode('1234')).toBe(false);
    expect(isValidZipcode('123456')).toBe(false);
  });

  it('숫자가 아닌 문자는 거부', () => {
    expect(isValidZipcode('1234a')).toBe(false);
    expect(isValidZipcode('abcde')).toBe(false);
  });

  it('하이픈 포함된 구 우편번호는 거부', () => {
    expect(isValidZipcode('123-456')).toBe(false);
  });

  it('빈 문자열은 거부', () => {
    expect(isValidZipcode('')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('일반 이메일은 통과', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@sub.domain.co.kr')).toBe(true);
  });

  it('@ 가 없으면 거부', () => {
    expect(isValidEmail('test.example.com')).toBe(false);
  });

  it('도메인이 없으면 거부', () => {
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('TLD가 없으면 거부', () => {
    expect(isValidEmail('test@example')).toBe(false);
  });

  it('공백을 포함하면 거부', () => {
    expect(isValidEmail('test @example.com')).toBe(false);
    expect(isValidEmail('test@ example.com')).toBe(false);
  });

  it('빈 문자열은 거부', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('8자 이상이면 통과', () => {
    expect(isValidPassword('12345678')).toBe(true);
    expect(isValidPassword('password123')).toBe(true);
  });

  it('7자 이하는 거부', () => {
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });

  it('정확히 8자는 통과', () => {
    expect(isValidPassword('abcdefgh')).toBe(true);
  });
});
