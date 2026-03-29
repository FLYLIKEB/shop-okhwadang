import type { MetadataRoute } from 'next';
import { fetchProducts } from '@/lib/api-server';

const SITE_URL = process.env.SITE_URL ?? 'https://commerce-demo.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/notice`, changeFrequency: 'weekly', priority: 0.5 },
  ];

  try {
    const result = await fetchProducts({ limit: 1000 });
    const productRoutes: MetadataRoute.Sitemap = result.items.map((p) => ({
      url: `${SITE_URL}/products/${p.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
