import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rendererPath = resolve(process.cwd(), 'src/components/shared/blocks/BlockRenderer.tsx');

describe('BlockRenderer architecture', () => {
  it('keeps the renderer server-side and delegates interactive islands explicitly', () => {
    const source = readFileSync(rendererPath, 'utf8');

    expect(source).not.toMatch(/^\s*["']use client["'];?\s*$/m);
    expect(source).toContain("import InteractiveBlock from './InteractiveBlock';");
    expect(source).toContain('staticBlockComponentMap');
  });
});
