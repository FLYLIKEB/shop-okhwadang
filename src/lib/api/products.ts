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
  isFreeShipping?: boolean;
  isVisibleKo?: boolean;
  isVisibleEn?: boolean;
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

export interface AttributeValueOption {
  value: string;
  displayValue: string | null;
}

export interface AttributeType {
  id: number;
  code: string;
  name: string;
  nameKo: string | null;
  nameEn?: string | null;
  inputType: 'text' | 'select' | 'range';
  isFilterable: boolean;
  isSearchable: boolean;
  validValues: string[] | null;
  parentId?: number | null;
  relatedTypeIds?: number[] | null;
  sortOrder: number;
  isActive?: boolean;
}

export interface ProductOption {
  id: number;
  name: string;
  value: string;
  priceAdjustment: number;
  stock: number;
  sortOrder: number;
}

export interface ProductNoticeInfo {
  type?: 'teaware' | 'tea';
  productName?: string;
  material?: string;
  components?: string;
  sizeCapacity?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  handlingPrecautions?: string;
  warrantyPolicy?: string;
  asContact?: string;
  foodType?: string;
  producer?: string;
  origin?: string;
  manufactureDate?: string;
  expirationDate?: string;
  storageMethod?: string;
  ingredients?: string;
  customerServicePhone?: string;
}

export interface ProductDetail extends Product {
  description: string | null;
  shortDescription: string | null;
  stock: number;
  sku: string | null;
  noticeInfo: ProductNoticeInfo | null;
  nameEn?: string | null;
  descriptionEn?: string | null;
  options: ProductOption[];
  detailImages: ProductDetailImage[];
}

export type ProductListResponse = PaginatedResponse<Product>;

export type ProductSort =
  'latest' | 'price_asc' | 'price_desc' | 'popular' | 'review_count' | 'rating';

export interface AutocompleteItem {
  id: number;
  name: string;
  slug: string;
}

export const productsApi = {
  getList: (params?: {
    page?: number;
    limit?: number;
    sort?: ProductSort;
    categoryId?: number;
    q?: string;
    price_min?: number;
    price_max?: number;
    locale?: string;
    attrs?: string;
  }) =>
    apiClient.get<ProductListResponse>('/products', {
      params: params as Record<string, string | number | undefined>,
    }),
  getById: (id: number, locale?: string) =>
    apiClient.get<ProductDetail>(`/products/${id}`, { params: locale ? { locale } : undefined }),
  getBulk: (ids: number[], locale?: string) =>
    apiClient.post<Product[]>(
      '/products/bulk',
      { ids },
      { params: locale ? { locale } : undefined },
    ),
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
  getTypeByCode: (code: string) =>
    apiClient.get<AttributeType | null>(`/attributes/types/code/${code}`),
  getTypeValues: (code: string) =>
    apiClient.get<Array<string | AttributeValueOption>>(`/attributes/types/${code}/values`),
  getProductAttributes: (productId: number) =>
    apiClient.get<ProductAttribute[]>(`/attributes/products/${productId}`),
  createType: (data: Partial<AttributeType> & { code: string; name: string }) =>
    apiClient.post<AttributeType>('/attributes/types', data),
  updateType: (id: number, data: Partial<AttributeType>) =>
    apiClient.patch<AttributeType>(`/attributes/types/${id}`, data),
  deleteType: (id: number) => apiClient.delete<void>(`/attributes/types/${id}`),
};

export const homeApi = {
  getFeaturedProducts: () =>
    apiClient.get<ProductListResponse>('/products', {
      params: { isFeatured: 'true', limit: 8, status: 'active' } as Record<
        string,
        string | number | undefined
      >,
    }),
  getPopularProducts: () =>
    apiClient.get<ProductListResponse>('/products', {
      params: { sort: 'popular', limit: 8, status: 'active' } as Record<
        string,
        string | number | undefined
      >,
    }),
};

export const healthApi = {
  check: () => apiClient.get<{ status: string; db: string; timestamp: string }>('/health'),
};
