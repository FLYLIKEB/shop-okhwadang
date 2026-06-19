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
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail?: string | null;
  memo?: string | null;
  policyConsents?: PolicyConsentSnapshot[];
  marketingConsent?: boolean;
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
