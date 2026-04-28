import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('middleware config matcher', () => {
  it('excludes sitemap.xml and robots.txt from locale middleware matching', () => {
    const middlewarePath = path.resolve(process.cwd(), 'src/middleware.ts');
    const middlewareSource = fs.readFileSync(middlewarePath, 'utf-8');

    expect(middlewareSource).toContain('robots.txt|sitemap.xml');
  });
});
