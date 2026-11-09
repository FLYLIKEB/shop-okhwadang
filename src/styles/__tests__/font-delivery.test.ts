import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const globals = readFileSync(join(root, 'src/styles/globals.css'), 'utf8');

describe('font delivery', () => {
  it('self-hosts only WOFF2 Google font assets with swap and unicode ranges', () => {
    expect(globals).toContain("@import './roboto-condensed.css'");
    expect(globals).not.toContain("@import './google-fonts.css'");
    const googleFonts = readFileSync(join(root, 'src/styles/roboto-condensed.css'), 'utf8');
    expect(googleFonts).not.toContain('.ttf');
    expect(googleFonts).not.toContain('https://');
    expect(googleFonts).toContain("font-family: 'Roboto Condensed'");
    expect(googleFonts).toContain('font-weight: 100 900');
    expect(googleFonts).toContain('font-style: italic');
    expect(googleFonts).toContain("font-display: swap;");
    expect(googleFonts).toContain('unicode-range:');

    const fontUrls = Array.from(googleFonts.matchAll(/src: url\('([^']+\.woff2)'\)/g), (match) => match[1]);
    expect(fontUrls.length).toBeGreaterThan(0);
    expect(new Set(fontUrls).size).toBe(fontUrls.length);
    for (const url of fontUrls) {
      expect(existsSync(join(root, 'public', url.slice(1))), url).toBe(true);
    }
  });

  it('uses Roboto Condensed for every typography role and legacy CMS override', () => {
    expect(globals).toContain("--font-body: 'Roboto Condensed', var(--db-font-family-base");
    for (const role of ['display', 'display-latin', 'mono', 'sans', 'serif']) {
      expect(globals).toContain(`--font-${role}: var(--font-body);`);
    }
    const typography = globals.replace(/@font-face\s*\{[^}]*\}/g, '');
    expect(typography).not.toMatch(/font-family:\s*(?:Pretendard|'Noto Serif KR'|'Cormorant Garamond'|'DM Mono')/);
  });

  it('delivers Korean fallback weights as bounded unicode subsets', () => {
    expect(globals).toContain("@import './pretendard-subsets.css'");
    const css = readFileSync(join(root, 'src/styles/pretendard-subsets.css'), 'utf8');
    const faces = Array.from(css.matchAll(/@font-face\{([^}]+)\}/g), (match) => match[1]);
    expect(new Set(faces.map((face) => Number(face.match(/font-weight:(\d+)/)?.[1])))).toEqual(new Set([400, 500, 600, 700]));
    const coverage = new Map<number, Set<number>>();
    for (const face of faces) {
      expect(face).toContain('font-display:swap');
      expect(face).toContain('unicode-range:U+');
      const weight = Number(face.match(/font-weight:(\d+)/)?.[1]);
      const covered = coverage.get(weight) ?? new Set<number>();
      for (const range of face.match(/unicode-range:([^;]+)/)![1].split(',')) {
        const [first, last = first] = range.slice(2).split('-').map((value) => parseInt(value, 16));
        for (let codepoint = first; codepoint <= last; codepoint += 1) {
          expect(covered.has(codepoint), `overlap for weight ${weight}`).toBe(false);
          covered.add(codepoint);
        }
      }
      coverage.set(weight, covered);
      const url = face.match(/url\('([^']+)'\)/)?.[1];
      expect(url).toBeDefined();
      const path = join(root, 'public', url!);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeLessThan(200_000);
    }
    for (const covered of coverage.values()) {
      for (let syllable = 0xAC00; syllable <= 0xD7A3; syllable += 1) {
        expect(covered.has(syllable), `missing Korean syllable ${syllable}`).toBe(true);
      }
      expect(covered).toEqual(coverage.get(400));
    }
    expect(existsSync(join(root, 'public/fonts/pretendard/OFL.txt'))).toBe(true);
  });

  it('does not leave legacy TTF payloads in the local Google font directory', () => {
    expect(readdirSync(join(root, 'public/fonts/google')).filter((file) => file.endsWith('.ttf'))).toEqual([]);
  });
});
