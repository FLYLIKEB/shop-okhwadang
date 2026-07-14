import nextConfig, { buildCheckoutContentSecurityPolicy } from '../../next.config';

function getCspDirective(csp: string, directive: string): string {
  const prefix = `${directive} `;
  const line = csp.split('; ').find((entry) => entry.startsWith(prefix));

  expect(line).toBeDefined();
  return line ?? '';
}

describe('Next.js CSP headers', () => {
  it('keeps COOP popup isolation on every response header set', async () => {
    const headers = await nextConfig.headers?.();
    const rootHeaders = headers?.find((entry) => entry.source === '/(.*)')?.headers ?? [];

    expect(rootHeaders).toContainEqual({
      key: 'Cross-Origin-Opener-Policy',
      value: 'same-origin-allow-popups',
    });
  });

  it('allows Google Analytics gtag script, collection endpoints, and audience image beacon', () => {
    const csp = buildCheckoutContentSecurityPolicy({});
    const imgSrc = getCspDirective(csp, 'img-src');

    expect(csp).toContain('https://www.googletagmanager.com');
    expect(csp).toContain('https://www.google-analytics.com');
    expect(csp).toContain('https://analytics.google.com');
    expect(csp).toContain('https://www.google.com');
    expect(csp).toContain('https://region1.google-analytics.com');
    expect(imgSrc).toContain('https://www.google.co.kr');
  });

  it('includes PayPal, NaverPay, and Eximbay origins for the default checkout contract', () => {
    const csp = buildCheckoutContentSecurityPolicy({});
    const scriptSrc = getCspDirective(csp, 'script-src');
    const connectSrc = getCspDirective(csp, 'connect-src');
    const frameSrc = getCspDirective(csp, 'frame-src');

    ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'].forEach(
      (origin) => {
        expect(csp).toContain(origin);
      },
    );

    expect(scriptSrc).toContain('https://nsp.pay.naver.com');
    [
      'https://pay.naver.com',
      'https://m.pay.naver.com',
      'https://test-pay.naver.com',
      'https://test-m.pay.naver.com',
    ].forEach((origin) => {
      expect(connectSrc).toContain(origin);
      expect(frameSrc).toContain(origin);
    });

    ['https://api-test.eximbay.com', 'https://api.eximbay.com'].forEach((origin) => {
      expect(scriptSrc).toContain(origin);
      expect(connectSrc).toContain(origin);
      expect(frameSrc).toContain(origin);
    });
  });

  it('adds Stripe sources when PAYMENT_GATEWAY=stripe keeps a hidden flow alive', () => {
    const csp = buildCheckoutContentSecurityPolicy({ PAYMENT_GATEWAY: 'stripe' });
    const scriptSrc = getCspDirective(csp, 'script-src');
    const connectSrc = getCspDirective(csp, 'connect-src');
    const frameSrc = getCspDirective(csp, 'frame-src');

    ['https://js.stripe.com', 'https://*.js.stripe.com'].forEach((origin) => {
      expect(scriptSrc).toContain(origin);
      expect(frameSrc).toContain(origin);
    });

    expect(connectSrc).toContain('https://api.stripe.com');
    expect(frameSrc).toContain('https://hooks.stripe.com');
  });

  it('drops NaverPay and Eximbay sources when checkout contract only enables paypal', () => {
    const csp = buildCheckoutContentSecurityPolicy({ CHECKOUT_ENABLED_GATEWAYS: 'paypal' });
    const scriptSrc = getCspDirective(csp, 'script-src');
    const connectSrc = getCspDirective(csp, 'connect-src');
    const frameSrc = getCspDirective(csp, 'frame-src');

    expect(csp).toContain('https://*.paypal.com');
    expect(scriptSrc).not.toContain('https://nsp.pay.naver.com');
    expect(connectSrc).not.toContain('https://pay.naver.com');
    expect(frameSrc).not.toContain('https://api.eximbay.com');
  });

  it('keeps SmartStore product images on the exact Naver image origin', () => {
    const csp = buildCheckoutContentSecurityPolicy({});
    const imgSrc = getCspDirective(csp, 'img-src');

    expect(imgSrc).toContain('https://shop-phinf.pstatic.net');
    expect(imgSrc).not.toContain('https://*.pstatic.net');
  });
});

describe('Next.js image cache policy', () => {
  it('keeps optimized remote product images cached beyond the default TTL', () => {
    expect(nextConfig.images?.minimumCacheTTL).toBe(86400);
  });
});
