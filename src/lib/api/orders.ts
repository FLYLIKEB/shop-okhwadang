import { apiClient, type PaginatedResponse, type RequestOptions } from './core';

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
  guestEmailNormalized?: string | null;
  orderLocale?: 'ko' | 'en';
  items: OrderItemResponse[];
  createdAt: string;
}

export type OrderServiceRequestType = 'cancel' | 'return' | 'exchange' | 'refund';
export type OrderServiceRequestStatus = 'requested' | 'approved' | 'rejected' | 'completed';

export interface OrderServiceRequest {
  id: number;
  orderId: number;
  userId: number;
  type: OrderServiceRequestType;
  status: OrderServiceRequestStatus;
  reason: string;
  detail: string | null;
  imageUrls: string[] | null;
  useShippingAddress: boolean;
  pickupName: string | null;
  pickupPhone: string | null;
  pickupZipcode: string | null;
  pickupAddress: string | null;
  pickupAddressDetail: string | null;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  order?: OrderResponse;
}

export interface CreateOrderServiceRequestBody {
  type: OrderServiceRequestType;
  reason: string;
  detail?: string;
  imageUrls?: string[];
  useShippingAddress?: boolean;
  pickupName?: string;
  pickupPhone?: string;
  pickupZipcode?: string;
  pickupAddress?: string;
  pickupAddressDetail?: string;
}

export interface PolicyConsentSnapshot {
  slug: string;
  version?: string | null;
  effectiveDate?: string | null;
}

export interface CreateOrderBody {
  items: Array<{ productId: number; productOptionId: number | null; quantity: number }>;
  preserveCart?: boolean;
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail?: string | null;
  memo?: string | null;
  orderLocale: 'ko' | 'en';
  policyConsents?: PolicyConsentSnapshot[];
  marketingConsent?: boolean;
  pointsUsed?: number;
  userCouponId?: number;
}

export interface CreateGuestOrderBody {
  items: Array<{ productId: number; productOptionId: number | null; quantity: number }>;
  preserveCart?: boolean;
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail?: string | null;
  memo?: string | null;
  guestEmail: string;
  orderLocale: 'ko' | 'en';
  policyConsents?: PolicyConsentSnapshot[];
  marketingConsent?: boolean;
}

export interface GuestOrderCreateResponse {
  order: OrderResponse;
  guestAccessToken: string;
  guestAccessTokenExpiresAt: string;
}

export interface GuestOrderLookupBody {
  orderNumber: string;
  email: string;
  locale?: 'ko' | 'en';
}

export interface GuestOrderLookupResponse {
  order: OrderResponse;
  guestAccessToken: string;
  guestAccessTokenExpiresAt: string;
}

function createGuestRequestOptions(
  guestAccessToken: string,
  options?: RequestOptions,
): RequestOptions {
  return {
    ...options,
    skipAuthRefresh: true,
    headers: {
      ...(options?.headers as Record<string, string> | undefined),
      'X-Guest-Access-Token': guestAccessToken,
    },
  };
}

export const ordersApi = {
  create: (body: CreateOrderBody, options?: RequestOptions) =>
    apiClient.post<OrderResponse>('/orders', body, options),
  getById: (id: number, options?: RequestOptions) =>
    apiClient.get<OrderResponse>(`/orders/${id}`, options),
  getList: (params?: { page?: number; limit?: number; locale?: string }, options?: RequestOptions) =>
    apiClient.get<PaginatedResponse<OrderResponse>>('/orders', { ...options, params }),
  getServiceRequests: (orderId: number) =>
    apiClient.get<OrderServiceRequest[]>(`/orders/${orderId}/service-requests`),
  createServiceRequest: (orderId: number, body: CreateOrderServiceRequestBody) =>
    apiClient.post<OrderServiceRequest>(`/orders/${orderId}/service-requests`, body),
};

export const guestOrdersApi = {
  create: (body: CreateGuestOrderBody, options?: RequestOptions) =>
    apiClient.post<GuestOrderCreateResponse>('/guest/orders', body, {
      ...options,
      skipAuthRefresh: true,
    }),
  getById: (id: number, guestAccessToken: string, locale?: 'ko' | 'en', options?: RequestOptions) =>
    apiClient.get<OrderResponse>(`/guest/orders/${id}`, {
      ...createGuestRequestOptions(guestAccessToken, options),
      params: {
        ...(options?.params ?? {}),
        locale,
      },
    }),
  lookup: (body: GuestOrderLookupBody, options?: RequestOptions) =>
    apiClient.post<GuestOrderLookupResponse>('/guest/orders/lookup', body, {
      ...options,
      skipAuthRefresh: true,
    }),
};
