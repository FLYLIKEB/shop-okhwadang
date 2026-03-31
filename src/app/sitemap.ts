import type { MetadataRoute } from 'next';
import { fetchProducts } from '@/lib/api-server';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.SITE_URL ?? 'https://shop-okhwadang.com';
const locales = routing.locales;

const staticPaths = [
  { path: '', changeFrequency: 'daily' as const, priority: 1 },
  { path: '/products', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: '/faq', changeFrequency: 'monthly' as const, priority: 0.5 },
  { path: '/notice', changeFrequency: 'weekly' as const, priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }))
  );

  try {
    const result = await fetchProducts({ limit: 1000 });
    const productRoutes: MetadataRoute.Sitemap = result.items.flatMap((p) =>
      locales.map((locale) => ({
        url: `${SITE_URL}/${locale}/products/${p.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    );
    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
