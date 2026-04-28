import { apiClient, type PaginatedResponse } from '../core';

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
