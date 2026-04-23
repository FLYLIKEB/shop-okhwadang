import { apiClient, type RequestOptions } from './core';
import type { ProductImage } from './products';

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
