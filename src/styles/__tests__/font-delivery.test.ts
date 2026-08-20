import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const globals = readFileSync(join(root, 'src/styles/globals.css'), 'utf8');
const googleFonts = readFileSync(join(root, 'src/styles/google-fonts.css'), 'utf8');

describe('font delivery', () => {
  it('self-hosts only WOFF2 Google font assets with swap and unicode ranges', () => {
    expect(googleFonts).not.toContain('.ttf');
    expect(googleFonts).toContain("font-display: swap;");
    expect(googleFonts).toContain('unicode-range:');

    const fontUrls = Array.from(googleFonts.matchAll(/src: url\('([^']+\.woff2)'\)/g), (match) => match[1]);
    expect(fontUrls.length).toBeGreaterThan(0);
    expect(new Set(fontUrls).size).toBe(fontUrls.length);
    for (const url of fontUrls) {
      expect(existsSync(join(root, 'public', url.slice(1))), url).toBe(true);
    }
  });

  it('keeps only the body weights used by the storefront', () => {
    const pretendardWeights = Array.from(
      globals.matchAll(/font-family:Pretendard;font-weight:(\d+)/g),
      (match) => Number(match[1]),
    );

    expect(pretendardWeights).toEqual([700, 600, 500, 400]);
    expect(readdirSync(join(root, 'public/fonts/pretendard')).sort()).toEqual([
      'Pretendard-Bold.woff2',
      'Pretendard-Medium.woff2',
      'Pretendard-Regular.woff2',
      'Pretendard-SemiBold.woff2',
    ]);
  });

  it('does not leave legacy TTF payloads in the local Google font directory', () => {
    expect(readdirSync(join(root, 'public/fonts/google')).filter((file) => file.endsWith('.ttf'))).toEqual([]);
  });
});
