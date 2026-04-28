// Barrel re-exports — preserves the `@/lib/api` import path used across the codebase.
// Internals are split into core/domain/admin modules under `src/lib/api/`.

export {
  apiClient,
  ApiClient,
  _setRefreshFn,
  type RequestOptions,
  type PaginatedResponse,
  type ListResponse,
  type UploadedFile,
} from './core';

// Domain modules
export * from './products';
export * from './cart';
export * from './orders';
export * from './payments';
export * from './auth';
export * from './users';
export * from './shipping';
export * from './pages';
export * from './navigation';
export * from './reviews';
export * from './wishlist';
export * from './coupons';
export * from './notices';
export * from './faqs';
export * from './inquiries';
export * from './promotions';
export * from './banners';
export * from './settings';
export * from './collections';
export * from './archives';
export * from './journals';

// Admin modules
export * from './admin/categories';
export * from './admin/products';
export * from './admin/orders';
export * from './admin/members';
export * from './admin/dashboard';
export * from './admin/pages';
export * from './admin/navigation';
export * from './admin/faqs';
export * from './admin/inquiries';
export * from './admin/settings';
export * from './admin/collections';
export * from './admin/archives';
export * from './admin/journals';
