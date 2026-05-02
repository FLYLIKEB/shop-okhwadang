import { describe, expect, it } from 'vitest';
import { getThemeStyle } from '../theme-style';

describe('getThemeStyle', () => {
  it('emits safe DB CSS variables for typography, spacing, radius, and colors', () => {
    const style = getThemeStyle({
      color_primary: '#123456',
      font_family_base: "'Pretendard', sans-serif",
      font_size_base: '18px',
      font_weight_normal: '450',
      line_height_base: '1.7',
      spacing_lg: '2rem',
      radius_md: '0.75rem',
    });

    expect(style).toContain('--db-color-primary: #123456');
    expect(style).toContain("--db-font-family-base: 'Pretendard', sans-serif");
    expect(style).toContain('--db-font-size-base: 18px');
    expect(style).toContain('--db-font-weight-normal: 450');
    expect(style).toContain('--db-line-height-base: 1.7');
    expect(style).toContain('--db-spacing-lg: 2rem');
    expect(style).toContain('--db-radius-md: 0.75rem');
  });

  it('drops unsafe values before creating inline CSS', () => {
    const style = getThemeStyle({
      font_size_base: '16px; color:red',
      font_family_base: "Pretendard; background:url('x')",
      spacing_md: 'calc(100vw)',
      radius_md: '1rem',
    });

    expect(style).not.toContain('font-size-base');
    expect(style).not.toContain('background:url');
    expect(style).not.toContain('calc(100vw)');
    expect(style).toContain('--db-radius-md: 1rem');
  });

  it('scopes dark color settings separately from locale-specific light settings', () => {
    const koStyle = getThemeStyle({ font_size_base: '1rem', color_primary: '#111111' });
    const enStyle = getThemeStyle({ font_size_base: '1.125rem', color_primary: '#222222' });
    const darkStyle = getThemeStyle({ color_dark_primary: '#000000' });

    expect(koStyle).toContain(':root { --db-font-size-base: 1rem; --db-color-primary: #111111 }');
    expect(enStyle).toContain(':root { --db-font-size-base: 1.125rem; --db-color-primary: #222222 }');
    expect(darkStyle).toContain('[data-theme="dark"] { --db-color-dark-primary: #000000 }');
  });
});
