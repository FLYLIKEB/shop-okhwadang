import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
const HANGUL = /[가-힣]/;
const TOAST_CALL = /toast\.(success|error|info|warning|message|loading|promise)\s*\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (['__tests__', 'node_modules', '.next', 'dist'].includes(entry)) return [];
      return sourceFiles(path);
    }

    if (!/\.(ts|tsx)$/.test(entry)) return [];
    return [path];
  });
}

describe('toast i18n', () => {
  it('does not pass Korean literals directly to toast calls', () => {
    const offenders = sourceFiles(ROOT).flatMap((path) => {
      const lines = readFileSync(path, 'utf8').split('\n');
      return lines.flatMap((line, index) => {
        if (!TOAST_CALL.test(line) || !HANGUL.test(line)) return [];
        return `${path.replace(`${process.cwd()}/`, '')}:${index + 1}: ${line.trim()}`;
      });
    });

    expect(offenders).toEqual([]);
  });
});
