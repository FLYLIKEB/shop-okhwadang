import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'cdn.okhwadang.com' },
      { protocol: 'https', hostname: 'shop-okhwadang.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'm.cbw.co.kr' },
      { protocol: 'https', hostname: 'gdimg.gmarket.co.kr' },
      { protocol: 'https', hostname: 'cdn-optimized.imweb.me' },
      { protocol: 'https', hostname: 'i.pinimg.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/:locale/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: process.env.NODE_ENV === 'production'
          ? "default-src 'self'; style-src 'self'; script-src 'self' https://js.tosspayments.com https://js.sandbox.tosspayments.com; object-src 'none'; base-uri 'self';"
          : "default-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://js.tosspayments.com https://js.sandbox.tosspayments.com; object-src 'none'; base-uri 'self';" },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    }];
  },
};

export default withNextIntl(nextConfig);
