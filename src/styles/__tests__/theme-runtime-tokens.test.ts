import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const globals = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8');
const lightTokens = readFileSync(join(process.cwd(), 'src/styles/tokens-light.css'), 'utf8');
const darkTokens = readFileSync(join(process.cwd(), 'src/styles/tokens-dark.css'), 'utf8');

const POINT_COLOR_TOKENS = [
  '--color-accent-zuni',
  '--color-accent-tea',
  '--color-brand-secondary',
  '--color-accent-danni',
  '--color-primary',
  '--color-ring',
  '--color-zuni',
  '--color-danni',
  '--color-zini',
  '--color-chunsuni',
  '--color-nokni',
  '--color-tea',
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  const normalized = value.length === 3
    ? value.split('').map((char) => `${char}${char}`).join('')
    : value.slice(0, 6);

  return [0, 2, 4].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function extractTokenHexValues(css: string, token: string): string[] {
  const pattern = new RegExp(`${token}\\s*:\\s*(?:var\\([^,]+,\\s*)?(#[0-9a-fA-F]{3,6})`, 'g');
  return Array.from(css.matchAll(pattern), (match) => match[1]);
}

function expectGrayscale(hex: string): void {
  const [red, green, blue] = hexToRgb(hex);
  expect([red, green, blue], `${hex} should have zero saturation`).toEqual([red, red, red]);
}

describe('runtime theme tokens', () => {
  it('connects admin typography settings to live CSS tokens', () => {
    expect(globals).toContain('--font-body: var(--db-font-family-base');
    expect(globals).toContain('--font-size-body: var(--db-font-size-base');
    expect(globals).toContain('--line-height-body: var(--db-line-height-base');
    expect(globals).toContain('--font-weight-normal: var(--db-font-weight-normal');
    expect(globals).toContain('--font-weight-bold: var(--db-font-weight-bold');
  });

  it('connects admin spacing settings to layout rhythm tokens', () => {
    expect(globals).toContain('--layout-spacing-xs: var(--db-spacing-xs');
    expect(globals).toContain('--layout-spacing-sm: var(--db-spacing-sm');
    expect(globals).toContain('--layout-spacing-md: var(--db-spacing-md');
    expect(globals).toContain('--layout-spacing-lg: var(--db-spacing-lg');
    expect(globals).toContain('--layout-spacing-xl: var(--db-spacing-xl');
    expect(globals).toContain('--layout-page-y: var(--layout-spacing-xl)');
    expect(globals).toContain('--layout-section-y: var(--layout-spacing-lg)');
    expect(globals).toContain('--layout-grid-gap: var(--layout-spacing-lg)');
    expect(globals).toContain('padding-inline: var(--layout-spacing-md)');
  });

  it('keeps global point color token defaults grayscale across themes', () => {
    const tokenSources = [globals, lightTokens, darkTokens];

    for (const token of POINT_COLOR_TOKENS) {
      const values = tokenSources.flatMap((source) => extractTokenHexValues(source, token));
      expect(values.length, `${token} should define at least one default color`).toBeGreaterThan(0);
      values.forEach(expectGrayscale);
    }
  });
});
