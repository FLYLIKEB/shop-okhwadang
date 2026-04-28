import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-intl/middleware', () => ({
  default: () => (req: { url: string }) => {
    const requestUrl = new URL(req.url);
    return new Response(null, {
      status: 307,
      headers: { location: `/ko${requestUrl.pathname}` },
    });
  },
}));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['ko', 'en'], defaultLocale: 'ko' },
}));

import { middleware } from '@/middleware';

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`);
}

describe('middleware seo routes', () => {
  it('does not redirect /sitemap.xml to locale path', async () => {
    const res = await middleware(makeRequest('/sitemap.xml'));

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not redirect /robots.txt to locale path', async () => {
    const res = await middleware(makeRequest('/robots.txt'));

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
