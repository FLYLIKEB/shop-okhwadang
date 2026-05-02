import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const globals = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8');

describe('runtime theme tokens', () => {
  it('connects admin typography settings to live CSS tokens', () => {
    expect(globals).toContain('--font-body: var(--db-font-family-base');
    expect(globals).toContain('--font-size-body: var(--db-font-size-base');
    expect(globals).toContain('--line-height-body: var(--db-line-height-base');
    expect(globals).toContain('--font-weight-normal: var(--db-font-weight-normal');
    expect(globals).toContain('--font-weight-bold: var(--db-font-weight-bold');
  });

  it('connects admin spacing settings to layout rhythm tokens', () => {
    expect(globals).toContain('--spacing-xs: var(--db-spacing-xs');
    expect(globals).toContain('--spacing-sm: var(--db-spacing-sm');
    expect(globals).toContain('--spacing-md: var(--db-spacing-md');
    expect(globals).toContain('--spacing-lg: var(--db-spacing-lg');
    expect(globals).toContain('--spacing-xl: var(--db-spacing-xl');
    expect(globals).toContain('--layout-page-y: var(--spacing-xl)');
    expect(globals).toContain('--layout-section-y: var(--spacing-lg)');
    expect(globals).toContain('--layout-grid-gap: var(--spacing-lg)');
    expect(globals).toContain('padding-inline: var(--spacing-md)');
  });
});
