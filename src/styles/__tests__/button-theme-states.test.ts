import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'src/styles/toss-tokens.css'), 'utf8');
const globals = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8');

function luminance(hex: string): number {
  return [0, 2, 4].reduce((sum, offset, index) => {
    const value = parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
    return sum + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

for (const theme of ['light', 'dark']) {
  const block = css.split(`html[data-theme='${theme}'] {`)[1].split('}')[0];
  const color = (token: string) => block.match(new RegExp(`--checkout-toss-${token}: (#[0-9a-f]{6});`))![1];
  describe(`${theme} button states`, () => {
    for (const variant of ['black', 'brown', 'white', 'gray']) {
      it(`${variant} has distinct readable default and hover colors`, () => {
        const foreground = color(variant === 'gray' ? 'foreground' : variant === 'white' ? 'button-black' : 'button-white');
        const background = color(`button-${variant}`);
        const hover = color(`button-${variant}-hover`);
        expect(background).not.toBe(hover);
        for (const fill of [background, hover]) {
          const a = luminance(foreground);
          const b = luminance(fill);
          expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  });
}

it('does not let scope overrides consume hover utility names', () => {
  expect(globals).not.toContain(".toss-admin [class*='bg-muted']");
  expect(globals).not.toContain(".checkout-toss-theme [class*='text-foreground']");
  expect(globals).not.toContain('--checkout-toss-button-gray-hover: var(--color-background)');
});
