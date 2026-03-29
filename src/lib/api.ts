const API_BASE = '/api';

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  isThumbnail: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
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

    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const authHeader: Record<string, string> = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    const { headers: optionHeaders, ...restFetchOptions } = fetchOptions ?? {};
    const response = await fetch(url, {
      ...restFetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(optionHeaders as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
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
  getList: (params?: { page?: number; limit?: number; sort?: ProductSort; categoryId?: number; q?: string; price_min?: number; price_max?: number }) =>
    apiClient.get<ProductListResponse>('/products', { params: params as Record<string, string | number | undefined> }),
  getById: (id: number) => apiClient.get<ProductDetail>(`/products/${id}`),
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
  prepare: (body: { orderId: number }, options?: RequestOptions) =>
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
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
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
  profile: () => apiClient.get<AuthUser>('/auth/profile'),
  refresh: (refreshToken: string) =>
    apiClient.post<RefreshResponse>('/auth/refresh', { refreshToken }),
  logout: () => apiClient.post<{ message: string }>('/auth/logout'),
  kakaoCallback: (code: string) =>
    apiClient.post<AuthTokenResponse>('/auth/kakao', { code }),
  googleCallback: (code: string) =>
    apiClient.post<AuthTokenResponse>('/auth/google', { code }),
};

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
  type: 'hero_banner' | 'product_grid' | 'product_carousel' | 'category_nav' | 'promotion_banner' | 'text_content';
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

export interface HeroBannerContent {
  title: string;
  subtitle?: string;
  image_url: string;
  cta_text?: string;
  cta_url?: string;
  template: 'slider' | 'fullscreen' | 'split';
}

export interface ProductGridContent {
  product_ids?: number[];
  category_id?: number;
  limit: number;
  template: '2col' | '3col' | '4col';
  title?: string;
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
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(url, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(url, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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
  content: string;
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
  getList: () => apiClient.get<NoticeListResponse>('/notices'),
  getOne: (id: number) => apiClient.get<Notice>(`/notices/${id}`),
};

// ===== FAQs =====
export interface Faq {
  id: number;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
}

export interface FaqListResponse {
  data: Faq[];
  total: number;
}

export const faqsApi = {
  getList: (category?: string) =>
    apiClient.get<FaqListResponse>(`/faqs${category ? `?category=${encodeURIComponent(category)}` : ''}`),
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
