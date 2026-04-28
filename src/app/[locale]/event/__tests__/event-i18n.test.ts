import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import koMessages from '@/i18n/messages/ko.json';
import enMessages from '@/i18n/messages/en.json';

const EVENT_PAGE_FILES = [
  'src/app/[locale]/event/page.tsx',
  'src/app/[locale]/event/[id]/page.tsx',
];

const REQUIRED_EVENT_KEYS = [
  'title',
  'empty',
  'notFound',
  'back',
  'list',
  'discount',
  'until',
  'timeLeft',
  'errorLoad',
  'types.timesale',
  'types.exhibition',
  'types.event',
];

const FORMER_HARDCODED_KOREAN = [
  '타임세일',
  '기획전',
  '이벤트 목록을 불러오지 못했습니다.',
  '이벤트/프로모션',
  '진행 중인 프로모션이 없습니다.',
  '% 할인',
  '까지',
  '남은 시간',
  '프로모션을 찾을 수 없습니다.',
  '돌아가기',
  '목록으로',
];

function getByPath(source: unknown, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

describe('event page i18n', () => {
  it('defines every event translation key for Korean and English', () => {
    for (const key of REQUIRED_EVENT_KEYS) {
      expect(getByPath(koMessages, `event.${key}`), `ko event.${key}`).toEqual(expect.any(String));
      expect(getByPath(enMessages, `event.${key}`), `en event.${key}`).toEqual(expect.any(String));
    }
  });

  it('keeps event page UI labels out of hardcoded Korean literals', () => {
    for (const relativeFile of EVENT_PAGE_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), relativeFile), 'utf8');

      for (const literal of FORMER_HARDCODED_KOREAN) {
        expect(source, `${relativeFile} should not contain ${literal}`).not.toContain(literal);
      }
    }
  });

  it('formats event dates with the active locale instead of a fixed Korean locale', () => {
    for (const relativeFile of EVENT_PAGE_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), relativeFile), 'utf8');

      expect(source).not.toContain("toLocaleDateString('ko-KR')");
      expect(source).toContain('DATE_LOCALE_MAP');
      expect(source).toContain('dateLocale');
    }
  });
});
