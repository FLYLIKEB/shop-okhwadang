import type { NextConfig } from 'next';
import { describe, expect, it, vi } from 'vitest';
import { getConfiguredCheckoutGatewayCspSources } from '@/lib/checkout-gateway-contract';

type CheckoutEnvOverrides = Partial<
  Record<'NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS' | 'CHECKOUT_ENABLED_GATEWAYS', string | undefined>
>;

function parseCspDirectives(headerValue: string): Record<string, string> {
  return Object.fromEntries(
    headerValue
      .split(';')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const [directive] = segment.split(' ', 1);
        return [directive, segment];
      }),
  );
}

async function loadNextConfigSnapshot(envOverrides: CheckoutEnvOverrides = {}) {
  const previousPublic = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
  const previousBackend = process.env.CHECKOUT_ENABLED_GATEWAYS;

  if ('NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS' in envOverrides) {
    const value = envOverrides.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
    if (value === undefined) delete process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
    else process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = value;
  } else {
    delete process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
  }

  if ('CHECKOUT_ENABLED_GATEWAYS' in envOverrides) {
    const value = envOverrides.CHECKOUT_ENABLED_GATEWAYS;
    if (value === undefined) delete process.env.CHECKOUT_ENABLED_GATEWAYS;
    else process.env.CHECKOUT_ENABLED_GATEWAYS = value;
  } else {
    delete process.env.CHECKOUT_ENABLED_GATEWAYS;
  }

  try {
    vi.resetModules();
    const nextConfig = (await import('../../next.config')).default as NextConfig;
    const headers = await nextConfig.headers?.();
    const contentSecurityPolicy = headers?.[0]?.headers.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';

    return {
      nextConfig,
      headers,
      directives: parseCspDirectives(contentSecurityPolicy),
    };
  } finally {
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
    else process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = previousPublic;

    if (previousBackend === undefined) delete process.env.CHECKOUT_ENABLED_GATEWAYS;
    else process.env.CHECKOUT_ENABLED_GATEWAYS = previousBackend;

    vi.resetModules();
  }
}

describe('Next.js CSP headers', () => {
  it('allows Google Analytics gtag script, collection endpoints, and audience image beacon', async () => {
    const { directives } = await loadNextConfigSnapshot();

    expect(directives['script-src']).toContain('https://www.googletagmanager.com');
    expect(directives['script-src']).toContain('https://www.google-analytics.com');
    expect(directives['connect-src']).toContain('https://analytics.google.com');
    expect(directives['connect-src']).toContain('https://www.google.com');
    expect(directives['connect-src']).toContain('https://region1.google-analytics.com');
    expect(directives['img-src']).toContain('https://www.google.co.kr');
  });

  it('uses the shared checkout gateway contract sources by default', async () => {
    const { directives } = await loadNextConfigSnapshot();
    const expectedSources = getConfiguredCheckoutGatewayCspSources(undefined);

    for (const [directive, origins] of Object.entries(expectedSources)) {
      for (const origin of origins) {
        expect(directives[directive]).toContain(origin);
      }
    }
  });

  it('allows Toss widget API and telemetry connections', async () => {
    const { directives } = await loadNextConfigSnapshot({
      NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS: 'toss',
      CHECKOUT_ENABLED_GATEWAYS: 'toss',
    });

    expect(directives['connect-src']).toContain('https://api.tosspayments.com');
    expect(directives['connect-src']).toContain('https://log.tosspayments.com');
    expect(directives['connect-src']).toContain('https://event.tosspayments.com');
  });

  it('keeps PayPal popup isolation enabled', async () => {
    const { headers } = await loadNextConfigSnapshot();
    const coop = headers?.[0]?.headers.find((header) => header.key === 'Cross-Origin-Opener-Policy')?.value;

    expect(coop).toBe('same-origin-allow-popups');
  });

  it('prunes disabled checkout gateway CSP origins when only paypal is enabled', async () => {
    const { directives } = await loadNextConfigSnapshot({
      NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS: 'paypal',
      CHECKOUT_ENABLED_GATEWAYS: 'paypal',
    });

    expect(directives['style-src']).toContain('https://*.paypal.com');
    expect(directives['connect-src']).toContain('https://*.paypal.com');
    expect(directives['script-src']).not.toContain('https://nsp.pay.naver.com');
    expect(directives['connect-src']).not.toContain('https://pay.naver.com');
    expect(directives['connect-src']).not.toContain('https://api-test.eximbay.com');
    expect(directives['frame-src']).not.toContain('https://pgonline.eximbay.com');
  });

  it('allows SmartStore product images from the exact Naver image origin', async () => {
    const { nextConfig, directives } = await loadNextConfigSnapshot();

    expect(nextConfig.images?.remotePatterns).toContainEqual({ protocol: 'https', hostname: 'shop-phinf.pstatic.net' });
    expect(directives['img-src']).toContain('https://shop-phinf.pstatic.net');
    expect(directives['img-src']).not.toContain('https://*.pstatic.net');
  });
});

describe('Next.js image cache policy', () => {
  it('keeps optimized remote product images cached beyond the default TTL', async () => {
    const { nextConfig } = await loadNextConfigSnapshot();

    expect(nextConfig.images?.minimumCacheTTL).toBe(86400);
  });
});
