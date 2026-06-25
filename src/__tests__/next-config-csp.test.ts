import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function getCspDirective(source: string, directive: string): string {
  const cspLine = source
    .split('\n')
    .find((line) => line.trim().startsWith(`"${directive} `));

  expect(cspLine).toBeDefined();
  return cspLine ?? '';
}

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

  it('allows NaverPay SDK and payment page origins in checkout CSP directives', () => {
    const source = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    const scriptSrc = getCspDirective(source, 'script-src');
    const connectSrc = getCspDirective(source, 'connect-src');
    const frameSrc = getCspDirective(source, 'frame-src');

    expect(scriptSrc).toContain('https://nsp.pay.naver.com');

    [
      'https://nsp.pay.naver.com',
      'https://pay.naver.com',
      'https://m.pay.naver.com',
      'https://test-pay.naver.com',
      'https://test-m.pay.naver.com',
    ].forEach((origin) => {
      expect(connectSrc).toContain(origin);
    });

    [
      'https://pay.naver.com',
      'https://m.pay.naver.com',
      'https://test-pay.naver.com',
      'https://test-m.pay.naver.com',
    ].forEach((origin) => {
      expect(frameSrc).toContain(origin);
    });
  });

  it('allows Stripe.js, Stripe API, and 3DS frame origins in checkout CSP directives', () => {
    const source = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    const scriptSrc = getCspDirective(source, 'script-src');
    const connectSrc = getCspDirective(source, 'connect-src');
    const frameSrc = getCspDirective(source, 'frame-src');

    ['https://js.stripe.com', 'https://*.js.stripe.com'].forEach((origin) => {
      expect(scriptSrc).toContain(origin);
      expect(frameSrc).toContain(origin);
    });

    expect(connectSrc).toContain('https://api.stripe.com');
    expect(frameSrc).toContain('https://hooks.stripe.com');
  });
});
