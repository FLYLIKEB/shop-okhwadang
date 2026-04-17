import { cache } from 'react';
import type { ProductListResponse, ProductSort, Category, ProductDetail, Page, CollectionsResponse, ArchivesResponse, SiteSetting } from '@/lib/api';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function fetchFromBackend<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  let url = `${BACKEND_URL}/api${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '오류가 발생했습니다.' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchProducts(params?: {
  page?: number;
  limit?: number;
  sort?: ProductSort;
  categoryId?: number;
  q?: string;
  price_min?: number;
  price_max?: number;
  isFeatured?: boolean;
  locale?: string;
  attrs?: string;
}) {
  return fetchFromBackend<ProductListResponse>(
    '/products',
    params as Record<string, string | number | undefined>,
  );
}

export function fetchCategories(locale?: string) {
  return fetchFromBackend<Category[]>('/categories', locale ? { locale } : undefined);
}

export const fetchProduct = cache(async (id: number, locale?: string): Promise<ProductDetail | null> => {
  try {
    return await fetchFromBackend<ProductDetail>(`/products/${id}`, locale ? { locale } : undefined);
  } catch {
    return null;
  }
});

export async function fetchPage(slug: string, locale?: string): Promise<Page | null> {
  try {
    return await fetchFromBackend<Page>(`/pages/${slug}`, locale ? { locale } : undefined);
  } catch {
    return null;
  }
}

export function fetchCollections(locale?: string) {
  return fetchFromBackend<CollectionsResponse>('/collections', locale ? { locale } : undefined);
}

export function fetchArchives(locale?: string) {
  return fetchFromBackend<ArchivesResponse>('/archives', locale ? { locale } : undefined);
}

export function fetchSettings(group?: string, locale?: string) {
  const params: Record<string, string | undefined> = {};
  if (group) params.group = group;
  if (locale) params.locale = locale;
  return fetchFromBackend<SiteSetting[]>('/settings', Object.keys(params).length ? params : undefined);
}

export function fetchSettingsMap(locale?: string) {
  return fetchFromBackend<Record<string, string>>('/settings/map', locale ? { locale } : undefined);
}
