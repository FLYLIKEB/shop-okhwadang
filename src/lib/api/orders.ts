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
  getList: (params?: { page?: number; limit?: number; locale?: string }, options?: RequestOptions) =>
    apiClient.get<PaginatedResponse<OrderResponse>>('/orders', { ...options, params }),
};
