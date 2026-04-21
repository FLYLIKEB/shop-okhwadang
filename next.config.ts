import type { NextConfig } from 'next';
import createBundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'cdn.ockhwadang.com' },
      { protocol: 'https', hostname: 'ockhwadang.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pinimg.com' },
      { protocol: 'https', hostname: 'm.cbw.co.kr' },
      { protocol: 'https', hostname: 'gdimg.gmarket.co.kr' },
      { protocol: 'https', hostname: 'cdn-optimized.imweb.me' },
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
        { key: 'Content-Security-Policy', value: [
          "default-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "script-src 'self' 'unsafe-inline' https://js.tosspayments.com https://js.sandbox.tosspayments.com https://static.cloudflareinsights.com",
          "object-src 'none'",
          "base-uri 'self'",
          "img-src 'self' data: https://images.unsplash.com https://*.amazonaws.com https://*.cloudfront.net https://cdn.ockhwadang.com https://ockhwadang.com https://i.pinimg.com https://m.cbw.co.kr https://gdimg.gmarket.co.kr https://cdn-optimized.imweb.me",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://cloudflareinsights.com",
        ].join('; ') + ';' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    }];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
