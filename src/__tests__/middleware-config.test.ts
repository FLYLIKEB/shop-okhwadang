import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('middleware config matcher', () => {
  it('excludes static metadata and asset paths from locale middleware matching', () => {
    const middlewarePath = path.resolve(process.cwd(), 'src/middleware.ts');
    const middlewareSource = fs.readFileSync(middlewarePath, 'utf-8');

    expect(middlewareSource).toContain('favicon.ico|robots.txt|sitemap.xml');
    expect(middlewareSource).toContain('.*\\\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|ttf|woff|woff2|eot|otf)$');
  });
});
