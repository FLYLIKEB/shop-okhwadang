import {
  emitGlobalLoadingEvent,
  GLOBAL_LOADING_END_EVENT,
  GLOBAL_LOADING_START_EVENT,
} from '@/constants/global-loading';

const API_BASE = '/api';

// Auth endpoints that must not trigger token refresh on 401 (would cause infinite loops)
const AUTH_SKIP_REFRESH = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/kakao',
  '/auth/google',
  '/auth/me',
]);

// 401 interceptor state — shared across all ApiClient instances
let _isRefreshing = false;
let _refreshQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

function _redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    const locale = document.documentElement.lang || 'ko';
    window.location.href = `/${locale}/login`;
  }
}

// Late-bound refresh function — set after authApi is created to avoid circular dependency
let _refreshFn: (() => Promise<unknown>) | null = null;

export function _setRefreshFn(fn: () => Promise<unknown>): void {
  _refreshFn = fn;
}

async function _ensureTokenRefreshed(): Promise<void> {
  if (_isRefreshing) {
    return new Promise<void>((resolve, reject) => {
      _refreshQueue.push({ resolve, reject });
    });
  }

  _isRefreshing = true;
  try {
    if (!_refreshFn) {
      throw new Error('토큰 갱신 함수가 등록되지 않았습니다.');
    }
    await _refreshFn();
    _refreshQueue.forEach((q) => q.resolve());
  } catch (err) {
    _refreshQueue.forEach((q) => q.reject(err));
    _redirectToLogin();
    throw err;
  } finally {
    _isRefreshing = false;
    _refreshQueue = [];
  }
}

export interface RequestOptions extends RequestInit {
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

    const { headers: optionHeaders, ...restFetchOptions } = fetchOptions ?? {};
    const isFormData = restFetchOptions.body instanceof FormData;
    const defaultHeaders: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
    emitGlobalLoadingEvent(GLOBAL_LOADING_START_EVENT);

    try {
      const response = await fetch(url, {
        ...restFetchOptions,
        credentials: 'include',
        headers: {
          ...defaultHeaders,
          ...(optionHeaders as Record<string, string> | undefined),
        },
      });

      if (response.status === 401) {
        if (AUTH_SKIP_REFRESH.has(endpoint)) {
          const error = await response.json().catch(() => ({ message: '오류가 발생했습니다.' }));
          throw new Error(error.message || `HTTP ${response.status}`);
        }
        await _ensureTokenRefreshed();
        // Retry original request after token refresh
        const retryResponse = await fetch(url, {
          ...restFetchOptions,
          credentials: 'include',
          headers: {
            ...defaultHeaders,
            ...(optionHeaders as Record<string, string> | undefined),
          },
        });
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ message: '오류가 발생했습니다.' }));
          throw new Error(error.message || `HTTP ${retryResponse.status}`);
        }
        if (retryResponse.status === 204 || retryResponse.headers.get('content-length') === '0') {
          return undefined as T;
        }
        return retryResponse.json() as Promise<T>;
      }

      if (response.status === 403) {
        const error = await response.json().catch(() => ({ message: '접근 권한이 없습니다.' }));
        const message = Array.isArray(error.message)
          ? error.message.join(', ')
          : (error.message || '접근 권한이 없습니다.');
        if (message === 'Forbidden') {
          throw new Error('접근 권한이 없습니다.');
        }
        throw new Error(message);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '오류가 발생했습니다.' }));
        const message = Array.isArray(error.message)
          ? error.message.join(', ')
          : (error.message || `HTTP ${response.status}`);
        throw new Error(message);
      }

      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }
      return response.json() as Promise<T>;
    } finally {
      emitGlobalLoadingEvent(GLOBAL_LOADING_END_EVENT);
    }
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

  uploadFile<T>(endpoint: string, file: File, fieldName = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.request<T>(endpoint, { method: 'POST', body: formData });
  }
}

export { ApiClient };

export const apiClient = new ApiClient(API_BASE);

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface UploadedFile {
  url: string;
  filename: string;
}
