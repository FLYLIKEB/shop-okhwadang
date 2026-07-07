import { apiClient, type PaginatedResponse } from '../core';
import type { OrderServiceRequest, OrderServiceRequestStatus, OrderServiceRequestType } from '../orders';

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
  cancelReason?: string | null;
  cancelledAt?: string | null;
  user?: { id: number; email: string; name: string };
  items: {
    id: number;
    productName: string;
    optionName: string | null;
    price: number;
    quantity: number;
  }[];
}

export type AdminOrderListResponse = PaginatedResponse<AdminOrder>;

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

export interface AdminOrderServiceRequestQueryParams {
  type?: OrderServiceRequestType;
  status?: OrderServiceRequestStatus;
  page?: number;
  limit?: number;
}

export const adminOrdersApi = {
  getList: (params?: AdminOrderQueryParams) =>
    apiClient.get<AdminOrderListResponse>('/admin/orders', {
      params: params as Record<string, string | number | undefined>,
    }),
  updateStatus: (id: number, status: string) =>
    apiClient.patch<AdminOrder>(`/admin/orders/${id}`, { status }),
  cancelOrder: (id: number, data: { reason: string }) =>
    apiClient.post<AdminOrder>(`/admin/orders/${id}/cancel`, data),
  registerShipping: (orderId: number, data: { carrier: string; trackingNumber: string }) =>
    apiClient.post<AdminShipping>(`/admin/shipping/${orderId}`, data),
  getServiceRequests: (params?: AdminOrderServiceRequestQueryParams) =>
    apiClient.get<PaginatedResponse<OrderServiceRequest>>('/admin/order-service-requests', {
      params: params as Record<string, string | number | undefined>,
    }),
  updateServiceRequest: (id: number, data: { status: OrderServiceRequestStatus; adminNote?: string }) =>
    apiClient.patch<OrderServiceRequest>(`/admin/order-service-requests/${id}`, data),
};
