const API_BASE = '/api';

// 401 interceptor state — shared across all ApiClient instances
let _isRefreshing = false;
let _refreshQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

function _redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    const locale = document.documentElement.lang || 'ko';
    window.location.href = `/${locale}/login`;
  }
}

// Late-bound refresh function — set after authApi is created to avoid circular dependency
let _refreshFn: (() => Promise<unknown>) | null = null;

export function _setRefreshFn(fn: () => Promise<unknown>): void {
  _refreshFn = fn;
}

async function _ensureTokenRefreshed(): Promise<void> {
  if (_isRefreshing) {
    return new Promise<void>((resolve, reject) => {
      _refreshQueue.push({ resolve, reject });
    });
  }

  _isRefreshing = true;
  try {
    if (!_refreshFn) {
      throw new Error('Refresh function not registered');
    }
    await _refreshFn();
    _refreshQueue.forEach((q) => q.resolve());
  } catch (err) {
    _refreshQueue.forEach((q) => q.reject(err));
    _redirectToLogin();
    throw err;
  } finally {
    _isRefreshing = false;
    _refreshQueue = [];
  }
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  isThumbnail: boolean;
  isDescriptionImage: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  children?: Category[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  isFeatured: boolean;
  viewCount: number;
  category: Category | null;
  images: ProductImage[];
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
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export type ProductSort = 'latest' | 'price_asc' | 'price_desc' | 'popular';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    let url = `${this.baseUrl}${endpoint}`;

    if (options?.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { params: _extractedParams, ...fetchOptions } = options ?? {};

    const { headers: optionHeaders, ...restFetchOptions } = fetchOptions ?? {};
    const response = await fetch(url, {
      ...restFetchOptions,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(optionHeaders as Record<string, string> | undefined),
      },
    });

    if (response.status === 401) {
      await _ensureTokenRefreshed();
      // Retry original request after token refresh
      const retryResponse = await fetch(url, {
        ...restFetchOptions,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(optionHeaders as Record<string, string> | undefined),
        },
      });
      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || `HTTP ${retryResponse.status}`);
      }
      if (retryResponse.status === 204 || retryResponse.headers.get('content-length') === '0') {
        return undefined as T;
      }
      return retryResponse.json() as Promise<T>;
    }

    if (response.status === 403) {
      throw new Error('접근 권한이 없습니다.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '오류가 발생했습니다.' }));
      const message = Array.isArray(error.message)
        ? error.message.join(', ')
        : (error.message || `HTTP ${response.status}`);
      throw new Error(message);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE);

export const healthApi = {
  check: () => apiClient.get<{ status: string; db: string; timestamp: string }>('/health'),
};

export interface AutocompleteItem {
  id: number;
  name: string;
  slug: string;
}

export const productsApi = {
  getList: (params?: { page?: number; limit?: number; sort?: ProductSort; categoryId?: number; q?: string; price_min?: number; price_max?: number; locale?: string }) =>
    apiClient.get<ProductListResponse>('/products', { params: params as Record<string, string | number | undefined> }),
  getById: (id: number, locale?: string) =>
    apiClient.get<ProductDetail>(`/products/${id}`, { params: locale ? { locale } : undefined }),
  autocomplete: (q: string) =>
    apiClient.get<AutocompleteItem[]>('/products/autocomplete', { params: { q } }),
};

export const searchApi = {
  getPopular: () => apiClient.get<{ keywords: string[] }>('/search/popular'),
};

export const categoriesApi = {
  getTree: () => apiClient.get<Category[]>('/categories'),
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

export interface CartItemOption {
  id: number;
  name: string;
  value: string;
  priceAdjustment: number;
}

export interface CartItemProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  status: string;
  images: ProductImage[];
}

export interface CartItem {
  id: number;
  productId: number;
  productOptionId: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: CartItemProduct;
  option: CartItemOption | null;
}

export interface CartResponse {
  items: CartItem[];
  totalAmount: number;
  itemCount: number;
}

export type { RequestOptions };

export const cartApi = {
  getList: (options?: RequestOptions) =>
    apiClient.get<CartResponse>('/cart', options),

  add: (
    body: { productId: number; productOptionId: number | null; quantity: number },
    options?: RequestOptions,
  ) => apiClient.post<CartResponse>('/cart', body, options),

  updateQuantity: (id: number, body: { quantity: number }, options?: RequestOptions) =>
    apiClient.patch<CartItem>(`/cart/${id}`, body, options),

  remove: (id: number, options?: RequestOptions) =>
    apiClient.delete<{ message: string }>(`/cart/${id}`, options),
};

export interface OrderItemResponse {
  id: number;
  productId: number;
  productOptionId: number | null;
  productName: string;
  optionName: string | null;
  price: number;
  quantity: number;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail: string | null;
  memo: string | null;
  items: OrderItemResponse[];
  createdAt: string;
}

export interface CreateOrderBody {
  items: Array<{ productId: number; productOptionId: number | null; quantity: number }>;
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail?: string | null;
  memo?: string | null;
}

export const ordersApi = {
  create: (body: CreateOrderBody, options?: RequestOptions) =>
    apiClient.post<OrderResponse>('/orders', body, options),
  getById: (id: number, options?: RequestOptions) =>
    apiClient.get<OrderResponse>(`/orders/${id}`, options),
  getList: (params?: { page?: number; limit?: number }, options?: RequestOptions) =>
    apiClient.get<{ items: OrderResponse[]; total: number; page: number; limit: number }>('/orders', { ...options, params }),
};

export interface PreparePaymentResponse {
  paymentId: number;
  orderId: number;
  orderNumber: string;
  amount: number;
  gateway: string;
  clientKey: string;
}

export interface ConfirmPaymentResponse {
  paymentId: number;
  orderId: number;
  orderNumber: string;
  status: string;
  method: string;
  amount: number;
  paidAt: string;
}

export const paymentsApi = {
  prepare: (body: { orderId: number; locale?: string }, options?: RequestOptions) =>
    apiClient.post<PreparePaymentResponse>('/payments/prepare', body, options),
  confirm: (body: { orderId: number; paymentKey: string; amount: number }, options?: RequestOptions) =>
    apiClient.post<ConfirmPaymentResponse>('/payments/confirm', body, options),
};

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
}

export interface UserAddress {
  id: number;
  userId: number;
  recipientName: string;
  phone: string;
  zipcode: string;
  address: string;
  addressDetail: string | null;
  label: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressData {
  recipientName: string;
  phone: string;
  zipcode: string;
  address: string;
  addressDetail?: string | null;
  label?: string | null;
  isDefault?: boolean;
}

export interface AuthTokenResponse {
  user: AuthUser;
}

export interface RefreshResponse {
  message: string;
}

export const usersApi = {
  updateProfile: (data: { name?: string; phone?: string | null }) =>
    apiClient.patch<AuthUser>('/users/me', data),
  getAddresses: () => apiClient.get<UserAddress[]>('/users/me/addresses'),
  createAddress: (data: CreateAddressData) =>
    apiClient.post<UserAddress>('/users/me/addresses', data),
  updateAddress: (id: number, data: Partial<CreateAddressData>) =>
    apiClient.patch<UserAddress>(`/users/me/addresses/${id}`, data),
  deleteAddress: (id: number) => apiClient.delete<{ message: string }>(`/users/me/addresses/${id}`),
};

export type ShippingStatus =
  | 'payment_confirmed'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'failed';

export type CarrierCode = 'mock' | 'cj' | 'hanjin' | 'lotte';

export interface TrackingStep {
  status: string;
  description: string;
  timestamp: string;
}

export interface TrackingResult {
  trackingNumber: string;
  status: 'shipped' | 'in_transit' | 'delivered';
  steps: TrackingStep[];
  estimatedDelivery?: string;
}

export interface ShippingResponse {
  id: number;
  order_id: number;
  carrier: CarrierCode;
  tracking_number: string | null;
  status: ShippingStatus;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking: TrackingResult | null;
}

export const shippingApi = {
  getByOrderId: (orderId: number) =>
    apiClient.get<ShippingResponse>(`/shipping/${orderId}`),
  track: (carrier: CarrierCode, trackingNumber: string) =>
    apiClient.post<{ carrier: CarrierCode; trackingNumber: string; status: string; steps: TrackingStep[] }>(
      '/shipping/track',
      { carrier, trackingNumber },
    ),
};

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  children?: AdminCategory[];
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  imageUrl?: string | null;
}

export interface CategoryOrderItem {
  id: number;
  sortOrder: number;
}

export const adminCategoriesApi = {
  getAll: () => apiClient.get<AdminCategory[]>('/categories/all'),
  create: (data: CreateCategoryData) => apiClient.post<AdminCategory>('/categories', data),
  update: (id: number, data: Partial<CreateCategoryData>) =>
    apiClient.patch<AdminCategory>(`/categories/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/categories/${id}`),
  reorder: (orders: CategoryOrderItem[]) =>
    apiClient.patch<void>('/categories/reorder', { orders }),
};

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthTokenResponse>('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    apiClient.post<AuthTokenResponse>('/auth/register', { email, password, name }),
  me: () => apiClient.get<AuthUser>('/auth/me'),
  profile: () => apiClient.get<AuthUser>('/auth/profile'),
  refresh: () =>
    apiClient.post<RefreshResponse>('/auth/refresh'),
  logout: () => apiClient.post<{ message: string }>('/auth/logout'),
  kakaoCallback: (code: string) =>
    apiClient.post<AuthTokenResponse>('/auth/kakao', { code }),
  googleCallback: (code: string) =>
    apiClient.post<AuthTokenResponse>('/auth/google', { code }),
};

// Register the refresh function after authApi is created
_setRefreshFn(() => authApi.refresh());

export interface AdminProductsParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface CreateProductData {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  salePrice?: number;
  stock?: number;
  sku?: string;
  status?: string;
  isFeatured?: boolean;
  name_en?: string;
  name_ja?: string;
  name_zh?: string;
  description_en?: string;
  description_ja?: string;
  description_zh?: string;
}

export type UpdateProductData = Partial<CreateProductData>;

export const adminProductsApi = {
  getList: (params?: AdminProductsParams) =>
    apiClient.get<ProductListResponse>('/products', {
      params: {
        ...params,
        // admin calls include all statuses
      } as Record<string, string | number | undefined>,
    }),
  create: (data: CreateProductData) =>
    apiClient.post<ProductDetail>('/products', data),
  update: (id: number, data: UpdateProductData) =>
    apiClient.patch<ProductDetail>(`/products/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<{ message: string }>(`/products/${id}`),
};

export interface AdminOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  recipientName: string;
  recipientPhone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; email: string; name: string };
  items: {
    id: number;
    productName: string;
    optionName: string | null;
    price: number;
    quantity: number;
  }[];
}

export interface AdminOrderListResponse {
  items: AdminOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminOrderQueryParams {
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AdminShipping {
  id: number;
  orderId: number;
  carrier: string;
  trackingNumber: string | null;
  status: string;
}

export const adminOrdersApi = {
  getList: (params?: AdminOrderQueryParams) =>
    apiClient.get<AdminOrderListResponse>('/admin/orders', {
      params: params as Record<string, string | number | undefined>,
    }),
  updateStatus: (id: number, status: string) =>
    apiClient.patch<AdminOrder>(`/admin/orders/${id}`, { status }),
  registerShipping: (orderId: number, data: { carrier: string; trackingNumber: string }) =>
    apiClient.post<AdminShipping>(`/admin/shipping/${orderId}`, data),
};

export interface AdminMember {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMemberListResponse {
  items: AdminMember[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminMemberQueryParams {
  q?: string;
  role?: string;
  is_active?: string;
  page?: number;
  limit?: number;
}

export const adminMembersApi = {
  getList: (params?: AdminMemberQueryParams) =>
    apiClient.get<AdminMemberListResponse>('/admin/members', {
      params: params as Record<string, string | number | undefined>,
    }),
  updateRole: (id: number, role: string) =>
    apiClient.patch<AdminMember>(`/admin/members/${id}`, { role }),
};

export interface DashboardKpi {
  today_revenue: number;
  today_revenue_diff_pct: number;
  today_orders: number;
  today_orders_diff_pct: number;
  new_members_today: number;
  new_members_diff_pct: number;
  total_product_views: number;
}

export interface RevenueChartItem {
  date: string;
  revenue: number;
  order_count: number;
}

export interface OrderStatusSummary {
  pending: number;
  paid: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
}

export interface DashboardRecentOrder {
  order_number: string;
  user_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface DashboardResponse {
  kpi: DashboardKpi;
  revenue_chart: RevenueChartItem[];
  order_status_summary: OrderStatusSummary;
  recent_orders: DashboardRecentOrder[];
}

export interface DashboardQueryParams {
  startDate?: string;
  endDate?: string;
  period?: string;
}

export const adminDashboardApi = {
  get: (params?: DashboardQueryParams) =>
    apiClient.get<DashboardResponse>('/admin/dashboard', {
      params: params as Record<string, string | undefined>,
    }),
};

export interface UploadedFile {
  url: string;
  filename: string;
}

export interface PageBlock {
  id: number;
  type: 'hero_banner' | 'product_grid' | 'product_carousel' | 'category_nav' | 'promotion_banner' | 'text_content' | 'split_content' | 'brand_story';
  content: Record<string, unknown>;
  sort_order: number;
  is_visible: boolean;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  blocks: PageBlock[];
  is_published: boolean;
}

export interface HeroBannerSlide {
  title: string;
  subtitle?: string;
  image_url?: string;
  bg_color?: string;
  cta_text?: string;
  cta_url?: string;
}

export interface HeroBannerContent {
  title: string;
  subtitle?: string;
  image_url: string;
  cta_text?: string;
  cta_url?: string;
  template: 'slider' | 'fullscreen' | 'split';
  slides?: HeroBannerSlide[];
}

export interface ProductGridContent {
  product_ids?: number[];
  category_id?: number;
  limit: number;
  template: '2col' | '3col' | '4col';
  title?: string;
  more_href?: string;
  /** 서버에서 미리 가져온 상품 데이터 (fallback용) */
  prefetched_products?: Product[];
}

export interface ProductCarouselContent {
  product_ids?: number[];
  category_id?: number;
  limit: number;
  template: 'default' | 'large';
  title?: string;
}

export interface CategoryNavContent {
  category_ids: number[];
  template: 'icon' | 'image' | 'text';
  /** 서버에서 미리 가져온 카테고리 데이터 (fallback용) */
  prefetched_categories?: Category[];
}

export interface PromotionBannerContent {
  title: string;
  subtitle?: string;
  image_url?: string;
  cta_text?: string;
  cta_url?: string;
  template: 'full-width' | 'card' | 'timer';
  end_date?: string;
}

export interface TextContentContent {
  html: string;
  textAlign?: 'left' | 'center' | 'right';
  template?: 'default' | 'highlight';
}

export interface SplitContentContent {
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  image_position?: 'left' | 'right';
  cta_text?: string;
  cta_url?: string;
  template?: 'default' | 'large' | 'compact';
}

export interface NewsletterSignupContent {
  title: string;
  description?: string;
  placeholder?: string;
  button_text?: string;
  template?: 'default' | 'minimal' | 'with_image';
  background_image?: string;
}

export interface ImageGalleryContent {
  title?: string;
  images: Array<{
    url: string;
    alt?: string;
    caption?: string;
    link_url?: string;
  }>;
  template?: 'grid' | 'masonry' | 'carousel';
  columns?: 2 | 3 | 4;
}

export const pagesApi = {
  getBySlug: (slug: string) => apiClient.get<Page>(`/pages/${slug}`),
  getAll: () => apiClient.get<Page[]>('/pages'),
};

export interface CreatePageData {
  title: string;
  slug: string;
  is_published?: boolean;
}

export interface CreateBlockData {
  type: PageBlock['type'];
  content: Record<string, unknown>;
  sort_order: number;
  is_visible?: boolean;
}

export const adminPagesApi = {
  getAll: () => apiClient.get<Page[]>('/admin/pages'),
  create: (data: CreatePageData) => apiClient.post<Page>('/pages', data),
  update: (id: number, data: Partial<Page>) =>
    apiClient.patch<Page>(`/pages/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/pages/${id}`),
  addBlock: (pageId: number, data: CreateBlockData) =>
    apiClient.post<PageBlock>(`/pages/${pageId}/blocks`, data),
  updateBlock: (pageId: number, blockId: number, data: Partial<PageBlock>) =>
    apiClient.patch<PageBlock>(`/pages/${pageId}/blocks/${blockId}`, data),
  deleteBlock: (pageId: number, blockId: number) =>
    apiClient.delete<void>(`/pages/${pageId}/blocks/${blockId}`),
  reorderBlocks: (pageId: number, orders: { id: number; sort_order: number }[]) =>
    apiClient.patch<void>(`/pages/${pageId}/blocks/reorder`, { orders }),
};

export interface NavigationItem {
  id: number;
  group: 'gnb' | 'sidebar' | 'footer';
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  parent_id: number | null;
  children: NavigationItem[];
}

export const navigationApi = {
  getByGroup: (group: 'gnb' | 'sidebar' | 'footer') =>
    apiClient.get<NavigationItem[]>(`/navigation?group=${group}`),
};

export const adminNavigationApi = {
  getByGroup: (group: 'gnb' | 'sidebar' | 'footer') =>
    apiClient.get<NavigationItem[]>(`/admin/navigation?group=${group}`),
  create: (data: { group: string; label: string; url: string; sort_order?: number; is_active?: boolean; parent_id?: number | null }) =>
    apiClient.post<NavigationItem>('/navigation', data),
  update: (id: number, data: { label?: string; url?: string; sort_order?: number; is_active?: boolean; parent_id?: number | null }) =>
    apiClient.patch<NavigationItem>(`/navigation/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<void>(`/navigation/${id}`),
  reorder: (orders: Array<{ id: number; sort_order: number }>) =>
    apiClient.patch<void>('/navigation/reorder', { orders }),
};

export interface ReviewItem {
  id: number;
  userId: number;
  userName: string;
  productId: number;
  orderItemId: number;
  rating: number;
  content: string | null;
  imageUrls: string[] | null;
  isVisible: boolean;
  createdAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalCount: number;
  distribution: Record<string, number>;
}

export interface ReviewListResponse {
  data: ReviewItem[];
  stats: ReviewStats;
  pagination: { page: number; limit: number; total: number };
}

export type ReviewSort = 'recent' | 'rating_high' | 'rating_low';

export interface ReviewQueryParams {
  productId?: number;
  sort?: ReviewSort;
  page?: number;
  limit?: number;
}

export interface CreateReviewData {
  productId: number;
  orderItemId: number;
  rating: number;
  content?: string | null;
  imageUrls?: string[];
}

export interface UpdateReviewData {
  rating?: number;
  content?: string | null;
  imageUrls?: string[];
}

export const reviewsApi = {
  getByProduct: (productId: number, params?: Omit<ReviewQueryParams, 'productId'>) =>
    apiClient.get<ReviewListResponse>('/reviews', {
      params: { productId, ...params } as Record<string, string | number | undefined>,
    }),
  create: (data: CreateReviewData) =>
    apiClient.post<ReviewItem>('/reviews', data),
  update: (id: number, data: UpdateReviewData) =>
    apiClient.patch<ReviewItem>(`/reviews/${id}`, data),
  delete: (id: number) =>
    apiClient.delete<void>(`/reviews/${id}`),
  uploadImage: async (file: File): Promise<UploadedFile> => {
    const url = `${API_BASE}/reviews/upload-image`;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error((error as { message?: string }).message || `HTTP ${response.status}`);
    }
    return response.json() as Promise<UploadedFile>;
  },
};

export const uploadApi = {
  uploadImage: async (file: File): Promise<UploadedFile> => {
    const url = `${API_BASE}/upload/image`;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error((error as { message?: string }).message || `HTTP ${response.status}`);
    }
    return response.json() as Promise<UploadedFile>;
  },
};

export interface WishlistProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  status: string;
  images: { url: string; alt: string | null; isThumbnail: boolean }[];
}

export interface WishlistItem {
  id: number;
  productId: number;
  createdAt: string;
  product?: WishlistProduct;
}

export interface WishlistListResponse {
  data: WishlistItem[];
  total: number;
}

export interface WishlistCheckResponse {
  isWishlisted: boolean;
  wishlistId: number | null;
}

export interface CreateWishlistResponse {
  id: number;
  productId: number;
  createdAt: string;
}

export const wishlistApi = {
  getList: () => apiClient.get<WishlistListResponse>('/wishlist'),
  check: (productId: number) =>
    apiClient.get<WishlistCheckResponse>('/wishlist/check', {
      params: { productId },
    }),
  add: (productId: number) =>
    apiClient.post<CreateWishlistResponse>('/wishlist', { productId }),
  remove: (id: number) => apiClient.delete<void>(`/wishlist/${id}`),
};

// ─── Coupons ──────────────────────────────────────────────────────────────────

export interface CouponItem {
  id: number;
  couponId: number;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  expiresAt: string;
  status: 'available' | 'used' | 'expired';
  issuedAt: string;
  usedAt: string | null;
}

export interface PointsInfo {
  balance: number;
  willExpireSoon: number;
}

export interface CouponListResponse {
  coupons: CouponItem[];
  points: PointsInfo;
}

export interface CalculateDiscountBody {
  orderAmount: number;
  userCouponId?: number;
  pointsToUse?: number;
}

export interface CalculateDiscountResponse {
  originalAmount: number;
  couponDiscount: number;
  pointsDiscount: number;
  finalAmount: number;
  shippingFee: number;
  totalPayable: number;
}

export interface PointHistoryItem {
  id: number;
  type: 'earn' | 'spend' | 'expire' | 'admin_adjust';
  amount: number;
  balance: number;
  description: string | null;
  createdAt: string;
}

export interface PointsResponse {
  balance: number;
  history: PointHistoryItem[];
}

export const couponsApi = {
  getList: (status?: string) =>
    apiClient.get<CouponListResponse>(`/coupons${status ? `?status=${status}` : ''}`),
  calculate: (body: CalculateDiscountBody) =>
    apiClient.post<CalculateDiscountResponse>('/coupons/calculate', body),
  getPoints: () => apiClient.get<PointsResponse>('/coupons/points'),
};

// ===== Notices =====
export interface Notice {
  id: number;
  title: string;
  titleEn: string | null;
  titleJa: string | null;
  titleZh: string | null;
  content: string;
  contentEn: string | null;
  contentJa: string | null;
  contentZh: string | null;
  isPinned: boolean;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeListResponse {
  data: Notice[];
  total: number;
}

export const noticesApi = {
  getList: (locale?: string) =>
    apiClient.get<NoticeListResponse>(`/notices${locale ? `?locale=${encodeURIComponent(locale)}` : ''}`),
  getOne: (id: number, locale?: string) =>
    apiClient.get<Notice>(`/notices/${id}${locale ? `?locale=${encodeURIComponent(locale)}` : ''}`),
};

// ===== FAQs =====
export interface Faq {
  id: number;
  category: string;
  question: string;
  questionEn: string | null;
  questionJa: string | null;
  questionZh: string | null;
  answer: string;
  answerEn: string | null;
  answerJa: string | null;
  answerZh: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface FaqListResponse {
  data: Faq[];
  total: number;
}

export const faqsApi = {
  getList: (category?: string, locale?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (locale) params.set('locale', locale);
    const qs = params.toString();
    return apiClient.get<FaqListResponse>(`/faqs${qs ? `?${qs}` : ''}`);
  },
};

// ===== Inquiries =====
export interface Inquiry {
  id: number;
  type: string;
  title: string;
  content: string;
  status: 'pending' | 'answered';
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export interface InquiryListResponse {
  data: Inquiry[];
  total: number;
}

export interface CreateInquiryBody {
  type: string;
  title: string;
  content: string;
}

export const inquiriesApi = {
  getList: () => apiClient.get<InquiryListResponse>('/inquiries'),
  getOne: (id: number) => apiClient.get<Inquiry>(`/inquiries/${id}`),
  create: (body: CreateInquiryBody) => apiClient.post<Inquiry>('/inquiries', body),
};

// ===== Promotions =====
export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  type: 'timesale' | 'exhibition' | 'event';
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  discountRate: number | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface PromotionListResponse {
  data: Promotion[];
  total: number;
}

export const promotionsApi = {
  getList: () => apiClient.get<Promotion[]>('/promotions'),
  getOne: (id: number) => apiClient.get<Promotion>(`/promotions/${id}`),
};

// ===== Banners =====
export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export const bannersApi = {
  getList: () => apiClient.get<Banner[]>('/banners'),
};

// ===== Site Settings =====
export interface SiteSetting {
  id: number;
  key: string;
  value: string;
  group: string;
  label: string;
  inputType: string;
  options: string | null;
  defaultValue: string;
  sortOrder: number;
}

export const settingsApi = {
  getAll: (group?: string) =>
    apiClient.get<SiteSetting[]>(`/settings${group ? `?group=${group}` : ''}`),
  getMap: () => apiClient.get<Record<string, string>>('/settings/map'),
};

export const adminSettingsApi = {
  getAll: (group?: string) =>
    apiClient.get<SiteSetting[]>(`/admin/settings${group ? `?group=${group}` : ''}`),
  bulkUpdate: (settings: Array<{ key: string; value: string }>) =>
    apiClient.put<SiteSetting[]>('/admin/settings', { settings }),
  reset: () =>
    apiClient.post<{ message: string }>('/admin/settings/reset'),
};

// ===== Collections =====
export enum CollectionType {
  CLAY = 'clay',
  SHAPE = 'shape',
}

export interface Collection {
  id: number;
  type: CollectionType;
  name: string;
  nameKo: string | null;
  color: string | null;
  description: string | null;
  imageUrl: string | null;
  productUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CollectionsResponse {
  clay: Collection[];
  shape: Collection[];
}

export const collectionsApi = {
  getAll: () => apiClient.get<CollectionsResponse>('/collections'),
};

// ===== Archives =====
export interface NiloType {
  id: number;
  name: string;
  nameKo: string;
  color: string;
  region: string;
  description: string;
  characteristics: string[];
  productUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProcessStep {
  id: number;
  step: number;
  title: string;
  description: string;
  detail: string;
}

export interface Artist {
  id: number;
  name: string;
  title: string;
  region: string;
  story: string;
  specialty: string;
  imageUrl: string | null;
  productUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ArchivesResponse {
  niloTypes: NiloType[];
  processSteps: ProcessStep[];
  artists: Artist[];
}

export const archivesApi = {
  getAll: () => apiClient.get<ArchivesResponse>('/archives'),
};

// ===== Admin Collections =====
export interface CreateCollectionData {
  type: 'clay' | 'shape';
  name: string;
  nameKo?: string;
  color?: string;
  description?: string;
  imageUrl?: string;
  productUrl: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const adminCollectionsApi = {
  getAll: () => apiClient.get<Collection[]>('/admin/collections'),
  create: (data: CreateCollectionData) =>
    apiClient.post<Collection>('/admin/collections', data),
  update: (id: number, data: Partial<CreateCollectionData>) =>
    apiClient.patch<Collection>(`/admin/collections/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<void>(`/admin/collections/${id}`),
  reorder: (orders: Array<{ id: number; sortOrder: number }>) =>
    apiClient.patch<void>('/admin/collections/reorder', orders),
};

// ===== Admin Archives =====
export interface CreateNiloTypeData {
  name: string;
  nameKo: string;
  color: string;
  region: string;
  description: string;
  characteristics: string[];
  productUrl: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateProcessStepData {
  step: number;
  title: string;
  description: string;
  detail: string;
}

export interface CreateArtistData {
  name: string;
  title: string;
  region: string;
  story: string;
  specialty: string;
  imageUrl?: string;
  productUrl: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const adminArchivesApi = {
  getNiloTypes: () => apiClient.get<NiloType[]>('/admin/archives/nilo-types'),
  createNiloType: (data: CreateNiloTypeData) =>
    apiClient.post<NiloType>('/admin/archives/nilo-types', data),
  updateNiloType: (id: number, data: Partial<CreateNiloTypeData>) =>
    apiClient.patch<NiloType>(`/admin/archives/nilo-types/${id}`, data),
  deleteNiloType: (id: number) =>
    apiClient.delete<void>(`/admin/archives/nilo-types/${id}`),
  reorderNiloTypes: (orders: Array<{ id: number; sortOrder: number }>) =>
    apiClient.patch<void>('/admin/archives/nilo-types/reorder', orders),

  getProcessSteps: () => apiClient.get<ProcessStep[]>('/admin/archives/process-steps'),
  createProcessStep: (data: CreateProcessStepData) =>
    apiClient.post<ProcessStep>('/admin/archives/process-steps', data),
  updateProcessStep: (id: number, data: Partial<CreateProcessStepData>) =>
    apiClient.patch<ProcessStep>(`/admin/archives/process-steps/${id}`, data),
  deleteProcessStep: (id: number) =>
    apiClient.delete<void>(`/admin/archives/process-steps/${id}`),

  getArtists: () => apiClient.get<Artist[]>('/admin/archives/artists'),
  createArtist: (data: CreateArtistData) =>
    apiClient.post<Artist>('/admin/archives/artists', data),
  updateArtist: (id: number, data: Partial<CreateArtistData>) =>
    apiClient.patch<Artist>(`/admin/archives/artists/${id}`, data),
  deleteArtist: (id: number) =>
    apiClient.delete<void>(`/admin/archives/artists/${id}`),
  reorderArtists: (orders: Array<{ id: number; sortOrder: number }>) =>
    apiClient.patch<void>('/admin/archives/artists/reorder', orders),
};
