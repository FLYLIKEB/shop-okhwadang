import { apiClient } from './core';
import type { AuthUser } from './auth';

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
