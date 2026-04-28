import { apiClient, type ListResponse } from './core';

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

export type WishlistListResponse = ListResponse<WishlistItem>;

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
