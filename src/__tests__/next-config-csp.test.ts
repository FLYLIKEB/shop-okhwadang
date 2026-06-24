import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Next.js CSP headers', () => {
  it('allows Google Analytics gtag script and collection endpoints', () => {
    const source = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');

    expect(source).toContain('https://www.googletagmanager.com');
    expect(source).toContain('https://www.google-analytics.com');
    expect(source).toContain('https://analytics.google.com');
    expect(source).toContain('https://www.google.com');
    expect(source).toContain('https://region1.google-analytics.com');
  });

  it('allows documented PayPal checkout SDK sources and popup isolation', () => {
    const source = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');

    expect(source).toContain("Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups");
    expect(source).toContain('https://*.paypal.com');
    expect(source).toContain('https://*.paypalobjects.com');
    expect(source).toContain('https://*.venmo.com');
    expect(source).toContain('child-src');
    expect(source).toContain('frame-src');
  });

});
