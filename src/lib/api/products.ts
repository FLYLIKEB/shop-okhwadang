import { apiClient, type PaginatedResponse } from './core';

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  isThumbnail: boolean;
  isDescriptionImage: boolean;
}

export interface ProductDetailImage {
  id: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  parentId: number | null;
  imageUrl: string | null;
  sortOrder?: number;
  isActive?: boolean;
  children?: Category[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  shortDescription: string | null;
  rating: number;
  reviewCount: number;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  isFeatured: boolean;
  viewCount: number;
  category: Category | null;
  images: ProductImage[];
  attributes?: ProductAttribute[];
}

export interface ProductAttribute {
  id: number;
  attributeTypeId: number;
  value: string;
  displayValue: string | null;
  sortOrder: number;
  attributeType?: AttributeType;
}

export interface AttributeType {
  id: number;
  code: string;
  name: string;
  nameKo: string | null;
  inputType: 'text' | 'select' | 'range';
  isFilterable: boolean;
  isSearchable: boolean;
  validValues: string[] | null;
  sortOrder: number;
}

export interface ProductOption {
  id: number;
  name: string;
  value: string;
  priceAdjustment: number;
  stock: number;
  sortOrder: number;
}

export interface ProductDetail extends Product {
  description: string | null;
  shortDescription: string | null;
  stock: number;
  sku: string | null;
  options: ProductOption[];
  detailImages: ProductDetailImage[];
}

export type ProductListResponse = PaginatedResponse<Product>;

export type ProductSort = 'latest' | 'price_asc' | 'price_desc' | 'popular' | 'review_count' | 'rating';

export interface AutocompleteItem {
  id: number;
  name: string;
  slug: string;
}

export const productsApi = {
  getList: (params?: { page?: number; limit?: number; sort?: ProductSort; categoryId?: number; q?: string; price_min?: number; price_max?: number; locale?: string; attrs?: string }) =>
    apiClient.get<ProductListResponse>('/products', { params: params as Record<string, string | number | undefined> }),
  getById: (id: number, locale?: string) =>
    apiClient.get<ProductDetail>(`/products/${id}`, { params: locale ? { locale } : undefined }),
  getBulk: (ids: number[], locale?: string) =>
    apiClient.post<Product[]>('/products/bulk', { ids }, { params: locale ? { locale } : undefined }),
  autocomplete: (q: string) =>
    apiClient.get<AutocompleteItem[]>('/products/autocomplete', { params: { q } }),
};

export const searchApi = {
  getPopular: () => apiClient.get<{ keywords: string[] }>('/search/popular'),
};

export const categoriesApi = {
  getTree: (locale?: string) =>
    apiClient.get<Category[]>('/categories', locale ? { params: { locale } } : undefined),
};

export const attributesApi = {
  getTypes: () => apiClient.get<AttributeType[]>('/attributes/types'),
  getFilterableTypes: () => apiClient.get<AttributeType[]>('/attributes/types/filterable'),
  getTypeById: (id: number) => apiClient.get<AttributeType>(`/attributes/types/${id}`),
  getTypeByCode: (code: string) => apiClient.get<AttributeType | null>(`/attributes/types/code/${code}`),
  getTypeValues: (code: string) => apiClient.get<string[]>(`/attributes/types/${code}/values`),
  getProductAttributes: (productId: number) => apiClient.get<ProductAttribute[]>(`/attributes/products/${productId}`),
};

export const homeApi = {
  getFeaturedProducts: () =>
    apiClient.get<ProductListResponse>('/products', {
      params: { isFeatured: 'true', limit: 8, status: 'active' } as Record<string, string | number | undefined>,
    }),
  getPopularProducts: () =>
    apiClient.get<ProductListResponse>('/products', {
      params: { sort: 'popular', limit: 8, status: 'active' } as Record<string, string | number | undefined>,
    }),
};

export const healthApi = {
  check: () => apiClient.get<{ status: string; db: string; timestamp: string }>('/health'),
};
