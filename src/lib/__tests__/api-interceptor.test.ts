import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Mock window.location for redirect tests
Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '' },
});

import { apiClient, authApi } from '@/lib/api';

function makeResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient 401 interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('401 응답 시 refresh 호출 후 원래 요청 재시도', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValue({ message: 'ok' });

    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeResponse(200, { id: 1, name: 'test' }));

    const result = await apiClient.get<{ id: number; name: string }>('/products/1');

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('refresh 실패 시 로그인 페이지로 리다이렉트', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockRejectedValue(new Error('Refresh failed'));

    fetchMock.mockResolvedValue(makeResponse(401, { message: 'Unauthorized' }));

    await expect(apiClient.get('/products/1')).rejects.toThrow();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(window.location.href).toMatch(/\/login/);
  });

  it('동시 다중 401 요청 시 refresh는 1번만 호출', async () => {
    let refreshResolve!: () => void;
    const refreshPromise = new Promise<void>((resolve) => {
      refreshResolve = resolve;
    });

    const refreshSpy = vi.spyOn(authApi, 'refresh').mockImplementation(() => {
      return refreshPromise.then(() => ({ message: 'ok' }));
    });

    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeResponse(200, { id: 1 }))
      .mockResolvedValueOnce(makeResponse(200, { id: 2 }))
      .mockResolvedValueOnce(makeResponse(200, { id: 3 }));

    const p1 = apiClient.get<{ id: number }>('/products/1');
    const p2 = apiClient.get<{ id: number }>('/products/2');
    const p3 = apiClient.get<{ id: number }>('/products/3');

    refreshResolve();

    const results = await Promise.all([p1, p2, p3]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(results[0].id).toBe(1);
    expect(results[1].id).toBe(2);
    expect(results[2].id).toBe(3);
  });

  it('403 응답 시 한국어 에러 메시지 throw', async () => {
    fetchMock.mockResolvedValue(makeResponse(403, { message: 'Forbidden' }));

    await expect(apiClient.get('/admin/dashboard')).rejects.toThrow('접근 권한이 없습니다.');
  });

  it('401이 아닌 다른 4xx 에러는 그대로 throw', async () => {
    fetchMock.mockResolvedValue(makeResponse(400, { message: '잘못된 요청입니다.' }));

    await expect(apiClient.get('/products/99')).rejects.toThrow('잘못된 요청입니다.');
  });
});
