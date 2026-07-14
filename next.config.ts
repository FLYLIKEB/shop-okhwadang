import type { NextConfig } from 'next';
import createBundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';
import {
  getCheckoutCspSources,
  type CheckoutCspDirective,
} from './backend/src/config/checkout-gateway-contract';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

function appendDirectiveSources(base: readonly string[], extra: readonly string[] = []): string {
  return [...new Set([...base, ...extra])].join(' ');
}

export function buildCheckoutContentSecurityPolicy(env: NodeJS.ProcessEnv = process.env): string {
  const checkoutSources = getCheckoutCspSources(env);
  const directive = (name: CheckoutCspDirective, base: readonly string[]) =>
    `${name} ${appendDirectiveSources(base, checkoutSources[name])}`;

  return (
    [
      "default-src 'self'",
      directive('style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']),
      directive('script-src', [
        "'self'",
        "'unsafe-inline'",
        'https://static.cloudflareinsights.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
      ]),
      "object-src 'none'",
      "base-uri 'self'",
      directive('img-src', [
        "'self'",
        'data:',
        'https://images.unsplash.com',
        'https://*.amazonaws.com',
        'https://*.cloudfront.net',
        'https://cdn.ockhwadang.com',
        'https://ockhwadang.com',
        'https://i.pinimg.com',
        'https://m.cbw.co.kr',
        'https://gdimg.gmarket.co.kr',
        'https://cdn-optimized.imweb.me',
        'https://shop-phinf.pstatic.net',
        'https://www.google.co.kr',
      ]),
      "font-src 'self' https://fonts.gstatic.com",
      directive('connect-src', [
        "'self'",
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://cloudflareinsights.com',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://www.google.com',
        'https://region1.google-analytics.com',
      ]),
      directive('child-src', ["'self'"]),
      directive('frame-src', ["'self'"]),
    ].join('; ') + ';'
  );
}

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'cdn.ockhwadang.com' },
      { protocol: 'https', hostname: 'ockhwadang.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pinimg.com' },
      { protocol: 'https', hostname: 'm.cbw.co.kr' },
      { protocol: 'https', hostname: 'gdimg.gmarket.co.kr' },
      { protocol: 'https', hostname: 'cdn-optimized.imweb.me' },
      { protocol: 'https', hostname: 'shop-phinf.pstatic.net' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  async rewrites() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          {
            key: 'Content-Security-Policy',
            value: buildCheckoutContentSecurityPolicy(process.env),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
