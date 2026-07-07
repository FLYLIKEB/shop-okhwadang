import type { MetadataRoute } from 'next';
import { fetchProducts } from '@/lib/api-server';
import type { Product } from '@/lib/api';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site-url';
const locales = routing.locales;
const PRODUCT_SITEMAP_PAGE_SIZE = 100;

const staticPaths = [
  { path: '', changeFrequency: 'daily' as const, priority: 1 },
  { path: '/products', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: '/faq', changeFrequency: 'monthly' as const, priority: 0.5 },
  { path: '/notice', changeFrequency: 'weekly' as const, priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.flatMap(
    ({ path, changeFrequency, priority }) =>
      locales.map((locale) => ({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
      })),
  );

  try {
    const productsByLocale = await Promise.all(
      locales.map(async (locale) => ({
        locale,
        products: await fetchSitemapProducts(locale),
      })),
    );
    const productRoutes: MetadataRoute.Sitemap = productsByLocale.flatMap(({ locale, products }) =>
      products.map((p) => ({
        url: `${SITE_URL}/${locale}/products/${p.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    );
    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}

async function fetchSitemapProducts(locale: string) {
  const products: Product[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (products.length < total) {
    const result = await fetchProducts({
      page,
      limit: PRODUCT_SITEMAP_PAGE_SIZE,
      locale,
    });

    products.push(...result.items);
    total = result.total;

    if (result.items.length === 0) {
      break;
    }
    page += 1;
  }

  return products;
}
