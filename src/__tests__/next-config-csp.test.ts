import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Next.js CSP headers', () => {
  it('allows Google Analytics gtag script and collection endpoints', () => {
    const source = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');

    expect(source).toContain('https://www.googletagmanager.com');
    expect(source).toContain('https://www.google-analytics.com');
    expect(source).toContain('https://region1.google-analytics.com');
  });
});
