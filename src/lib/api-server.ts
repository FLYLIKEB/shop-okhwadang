import { cache } from 'react';
import type { ProductListResponse, ProductSort, Category, ProductDetail, Page, CollectionsResponse, ArchivesResponse } from '@/lib/api';

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
}) {
  return fetchFromBackend<ProductListResponse>(
    '/products',
    params as Record<string, string | number | undefined>,
  );
}

export function fetchCategories() {
  return fetchFromBackend<Category[]>('/categories');
}

export const fetchProduct = cache(async (id: number, locale?: string): Promise<ProductDetail | null> => {
  try {
    return await fetchFromBackend<ProductDetail>(`/products/${id}`, locale ? { locale } : undefined);
  } catch {
    return null;
  }
});

export async function fetchPage(slug: string): Promise<Page | null> {
  try {
    return await fetchFromBackend<Page>(`/pages/${slug}`);
  } catch {
    return null;
  }
}

export function fetchCollections() {
  return fetchFromBackend<CollectionsResponse>('/collections');
}

export function fetchArchives() {
  return fetchFromBackend<ArchivesResponse>('/archives');
}
