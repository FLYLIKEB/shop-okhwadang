import type { MetadataRoute } from 'next';

const SITE_URL = process.env.SITE_URL ?? 'https://shop-okhwadang.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/my/', '/checkout/'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
