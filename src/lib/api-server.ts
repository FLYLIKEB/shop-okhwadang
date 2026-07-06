import { cache } from 'react';
import type { ProductListResponse, ProductSort, Category, ProductDetail, Page, SiteSetting, Journal, AttributeType, AttributeValueOption } from '@/lib/api';
import { toAttributeFilterOptions, type AttributeFilterGroup } from '@/lib/attributeFilterOptions';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

class BackendHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'BackendHttpError';
  }
}



interface BackendFetchPolicy {
  revalidate?: number;
  tags?: string[];
}

const CACHE_POLICIES = {
  catalog: { revalidate: 60, tags: ['catalog'] },
  product: { revalidate: 60, tags: ['catalog', 'product'] },
  categories: { revalidate: 300, tags: ['catalog', 'categories'] },
  cms: { revalidate: 300, tags: ['cms'] },
  settings: { revalidate: 300, tags: ['settings', 'theme'] },
} as const satisfies Record<string, BackendFetchPolicy>;

async function fetchFromBackend<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
  policy?: BackendFetchPolicy,
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

  const shouldUseCachePolicy = Boolean(policy) && process.env.CI !== 'true';
  const response = await fetch(url, shouldUseCachePolicy ? { next: policy } : { cache: 'no-store' });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '오류가 발생했습니다.' }));
    throw new BackendHttpError(error.message || `HTTP ${response.status}`, response.status);
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
    CACHE_POLICIES.catalog,
  );
}

export function fetchCategories(locale?: string) {
  return fetchFromBackend<Category[]>('/categories', locale ? { locale } : undefined, CACHE_POLICIES.categories);
}

export const fetchProduct = cache(async (id: number, locale?: string): Promise<ProductDetail | null> => {
  try {
    return await fetchFromBackend<ProductDetail>(`/products/${id}`, locale ? { locale } : undefined, CACHE_POLICIES.product);
  } catch (err) {
    if (err instanceof BackendHttpError && err.status === 404) {
      return null;
    }
    throw err;
  }
});

export async function fetchPage(slug: string, locale?: string): Promise<Page | null> {
  try {
    return await fetchFromBackend<Page>(`/pages/${slug}`, locale ? { locale } : undefined, { ...CACHE_POLICIES.cms, tags: [...CACHE_POLICIES.cms.tags, `page:${slug}`] });
  } catch {
    return null;
  }
}


export async function fetchJournal(slug: string, locale?: string): Promise<Journal | null> {
  try {
    return await fetchFromBackend<Journal>(`/journals/${slug}`, locale ? { locale } : undefined, { ...CACHE_POLICIES.cms, tags: [...CACHE_POLICIES.cms.tags, `journal:${slug}`] });
  } catch {
    return null;
  }
}


export async function fetchCatalogFilterOptions(locale?: string): Promise<AttributeFilterGroup[]> {
  const types = await fetchFromBackend<AttributeType[]>(
    '/attributes/types/filterable',
    locale ? { locale } : undefined,
    CACHE_POLICIES.catalog,
  );
  const valueLists = await Promise.all(
    types.map((type) =>
      fetchFromBackend<Array<string | AttributeValueOption>>(
        `/attributes/types/${type.code}/values`,
        undefined,
        CACHE_POLICIES.catalog,
      ),
    ),
  );

  return types
    .map((type, index) => ({
      code: type.code,
      label: type.name,
      options: toAttributeFilterOptions(valueLists[index] ?? []),
    }))
    .filter((group) => group.options.length > 0);
}


export function fetchSettings(group?: string, locale?: string) {
  const params: Record<string, string | undefined> = {};
  if (group) params.group = group;
  if (locale) params.locale = locale;
  return fetchFromBackend<SiteSetting[]>('/settings', Object.keys(params).length ? params : undefined, CACHE_POLICIES.settings);
}

export function fetchSettingsMap(locale?: string) {
  return fetchFromBackend<Record<string, string>>('/settings/map', locale ? { locale } : undefined, CACHE_POLICIES.settings);
}

export interface AnnouncementBarItem {
  id: number;
  message: string;
  message_en: string | null;
  href: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchAnnouncementBars(locale?: string): Promise<AnnouncementBarItem[]> {
  try {
    return await fetchFromBackend<AnnouncementBarItem[]>('/announcement-bars', locale ? { locale } : undefined, { revalidate: 60, tags: ['announcement-bars'] });
  } catch {
    return [];
  }
}
