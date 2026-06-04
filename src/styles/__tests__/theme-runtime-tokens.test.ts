import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const globals = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8');
const lightTokens = readFileSync(join(process.cwd(), 'src/styles/tokens-light.css'), 'utf8');
const darkTokens = readFileSync(join(process.cwd(), 'src/styles/tokens-dark.css'), 'utf8');

const grayscaleMigration = readFileSync(join(process.cwd(), 'backend/src/database/migrations/1784300000000-UpdateThemeColorsGrayscale.ts'), 'utf8');
const darkSettingsMigration = readFileSync(join(process.cwd(), 'backend/src/database/migrations/1783000000000-AddDarkModeColorSettings.ts'), 'utf8');

const runtimePointColorSources = [
  'src/components/shared/blocks/HeroBannerBlock.tsx',
  'src/components/shared/blocks/PromotionBannerBlock.tsx',
  'src/components/shared/PageTransition.tsx',
  'src/app/[locale]/admin/settings/theme/ThemeEditor.tsx',
].map((file) => [file, readFileSync(join(process.cwd(), file), 'utf8')] as const);

const LEGACY_POINT_COLOR_HEXES = [
  '#8B5A2B',
  '#FDFBF7',
  '#F5E6D3',
  '#3D2314',
  '#2C1810',
  '#E8DDD4',
  '#F5F0EB',
  '#8B7355',
  '#C4A77D',
  '#B8976A',
  '#C4956A',
  '#141210',
  '#1E1C18',
  '#E8E0D4',
  '#F0EDE8',
  '#2E2822',
  '#9B8E7E',
] as const;

const GRAYSCALE_DB_THEME_COLORS = {
  color_primary: '#353535',
  color_primary_foreground: '#ffffff',
  color_secondary: '#F0F0F0',
  color_secondary_foreground: '#1a1a1a',
  color_background: '#F9F9F9',
  color_foreground: '#1a1a1a',
  color_destructive: '#3D3D3D',
  color_destructive_foreground: '#ffffff',
  color_border: '#E1E1E1',
  color_muted: '#F0F0F0',
  color_muted_foreground: '#525252',
  color_ring: '#353535',
  color_accent: '#F0F0F0',
  color_accent_foreground: '#1a1a1a',
  color_card: '#F9F9F9',
  color_card_foreground: '#1a1a1a',
  color_input: '#E1E1E1',
  color_dark_primary: '#9C9C9C',
  color_dark_primary_foreground: '#121212',
  color_dark_secondary: '#1C1C1C',
  color_dark_secondary_foreground: '#E1E1E1',
  color_dark_background: '#121212',
  color_dark_foreground: '#EDEDED',
  color_dark_card: '#171717',
  color_dark_card_foreground: '#EDEDED',
  color_dark_border: '#292929',
  color_dark_input: '#292929',
  color_dark_muted: '#1C1C1C',
  color_dark_muted_foreground: '#909090',
  color_dark_accent: '#1C1C1C',
  color_dark_accent_foreground: '#E1E1E1',
  color_dark_destructive: '#686868',
  color_dark_destructive_foreground: '#ffffff',
  color_dark_ring: '#9C9C9C',
} as const;

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
  '--color-heukni',
  '--color-chunsuni',
  '--color-nokni',
  '--color-tea',
] as const;

const DARK_BASE_COLOR_TOKENS = [
  '--color-bg',
  '--color-secondary',
  '--color-muted',
  '--color-accent',
  '--color-background',
  '--color-card',
  '--color-border',
  '--color-input',
  '--color-surface',
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



  it('migrates persisted DB theme colors away from legacy brown point colors', () => {
    for (const [key, hex] of Object.entries(GRAYSCALE_DB_THEME_COLORS)) {
      expect(grayscaleMigration, `${key} should be updated by the grayscale DB migration`).toContain(`${key}: '${hex}'`);
      expectGrayscale(hex);
    }
    expect(grayscaleMigration).toContain('default_value');
    expect(grayscaleMigration).toContain('value_en');
  });

  it('keeps fresh dark theme setting inserts grayscale', () => {
    const upSection = darkSettingsMigration.split('public async down')[0];
    for (const legacyHex of LEGACY_POINT_COLOR_HEXES) {
      expect(upSection, `fresh dark settings should not insert ${legacyHex}`).not.toContain(legacyHex);
    }
  });

  it('does not hardcode legacy brown point colors in runtime point-color components', () => {
    for (const [file, source] of runtimePointColorSources) {
      for (const legacyHex of LEGACY_POINT_COLOR_HEXES) {
        expect(source, `${file} should use grayscale theme tokens instead of ${legacyHex}`).not.toContain(legacyHex);
      }
    }
  });

  it('keeps dark theme base surface defaults grayscale', () => {
    for (const token of DARK_BASE_COLOR_TOKENS) {
      const values = extractTokenHexValues(darkTokens, token);
      expect(values.length, `${token} should define at least one dark default color`).toBeGreaterThan(0);
      values.forEach(expectGrayscale);
    }
  });
});
