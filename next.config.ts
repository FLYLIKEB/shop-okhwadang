import type { NextConfig } from 'next';
import createBundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';
import { getConfiguredCheckoutGatewayCspSources } from './src/lib/checkout-gateway-contract';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const enabledCheckoutGatewaySources = getConfiguredCheckoutGatewayCspSources(
  process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS ?? process.env.CHECKOUT_ENABLED_GATEWAYS,
);

const legacyPaymentSdkSources = {
  'script-src': ['https://js.tosspayments.com', 'https://js.sandbox.tosspayments.com', 'https://js.stripe.com', 'https://*.js.stripe.com'],
  'connect-src': ['https://api.stripe.com'],
  'child-src': ['https://js.stripe.com', 'https://*.js.stripe.com', 'https://hooks.stripe.com'],
  'frame-src': ['https://js.stripe.com', 'https://*.js.stripe.com', 'https://hooks.stripe.com'],
} as const;

function mergeSources(...groups: readonly (readonly string[])[]): string[] {
  return [...new Set(groups.flat())];
}

const contentSecurityPolicyDirectives: Array<[string, string[]]> = [
  ["default-src", ["'self'"]],
  ["style-src", mergeSources(["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], enabledCheckoutGatewaySources['style-src'])],
  [
    "script-src",
    mergeSources(
      ["'self'", "'unsafe-inline'", 'https://static.cloudflareinsights.com', 'https://www.googletagmanager.com', 'https://www.google-analytics.com'],
      legacyPaymentSdkSources['script-src'],
      enabledCheckoutGatewaySources['script-src'],
    ),
  ],
  ["object-src", ["'none'"]],
  ["base-uri", ["'self'"]],
  [
    "img-src",
    mergeSources(
      ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.amazonaws.com', 'https://*.cloudfront.net', 'https://cdn.ockhwadang.com', 'https://ockhwadang.com', 'https://i.pinimg.com', 'https://m.cbw.co.kr', 'https://gdimg.gmarket.co.kr', 'https://cdn-optimized.imweb.me', 'https://shop-phinf.pstatic.net', 'https://www.google.co.kr'],
      enabledCheckoutGatewaySources['img-src'],
    ),
  ],
  ["font-src", ["'self'", 'https://fonts.gstatic.com']],
  [
    "connect-src",
    mergeSources(
      ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cloudflareinsights.com', 'https://www.google-analytics.com', 'https://analytics.google.com', 'https://www.google.com', 'https://region1.google-analytics.com'],
      legacyPaymentSdkSources['connect-src'],
      enabledCheckoutGatewaySources['connect-src'],
    ),
  ],
  ["child-src", mergeSources(["'self'"], legacyPaymentSdkSources['child-src'], enabledCheckoutGatewaySources['child-src'])],
  ["frame-src", mergeSources(["'self'"], legacyPaymentSdkSources['frame-src'], enabledCheckoutGatewaySources['frame-src'])],
];

const contentSecurityPolicy = contentSecurityPolicyDirectives
  .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
  .join('; ') + ';';

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
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    }];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
