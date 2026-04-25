/**
 * /auth/* 엔드포인트는 401 응답 시 토큰 갱신 인터셉터를 스킵해야 한다.
 * 회귀 시 무한 refresh 루프가 발생할 수 있어 별도 회귀 가드 테스트로 분리.
 * (memory: feedback_api_client.md)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

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

describe('ApiClient — /auth/* 엔드포인트 401 인터셉터 스킵', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('/auth/login 401 응답 시 refresh 호출하지 않고 에러 throw', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValue({ message: 'ok' });
    fetchMock.mockResolvedValueOnce(
      makeResponse(401, { message: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
    );

    await expect(
      apiClient.post('/auth/login', { email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow('이메일 또는 비밀번호가 올바르지 않습니다.');

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('');
  });

  it('/auth/refresh 자체가 401 이면 refresh 재호출하지 않음 (무한 루프 방지)', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh');
    fetchMock.mockResolvedValueOnce(makeResponse(401, { message: 'Refresh expired' }));

    await expect(apiClient.post('/auth/refresh')).rejects.toThrow();

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('/auth/me 401 응답 시 refresh 인터셉터 동작하지 않음', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValue({ message: 'ok' });
    fetchMock.mockResolvedValueOnce(makeResponse(401, { message: 'Unauthorized' }));

    await expect(apiClient.get('/auth/me')).rejects.toThrow();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('/auth/logout 401 응답 시 refresh 호출하지 않음', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValue({ message: 'ok' });
    fetchMock.mockResolvedValueOnce(makeResponse(401));

    await expect(apiClient.post('/auth/logout')).rejects.toThrow();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('/auth/register 401 응답 시 refresh 호출하지 않음', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValue({ message: 'ok' });
    fetchMock.mockResolvedValueOnce(
      makeResponse(401, { message: '이미 사용 중인 이메일입니다.' }),
    );

    await expect(
      apiClient.post('/auth/register', { email: 'x@y.com', password: 'pw', name: 'a' }),
    ).rejects.toThrow('이미 사용 중인 이메일입니다.');

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('/auth/kakao 401 응답 시 refresh 호출하지 않음', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValue({ message: 'ok' });
    fetchMock.mockResolvedValueOnce(makeResponse(401, { message: 'OAuth 인증 실패' }));

    await expect(apiClient.post('/auth/kakao', { code: 'abc' })).rejects.toThrow();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('/auth/google 401 응답 시 refresh 호출하지 않음', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValue({ message: 'ok' });
    fetchMock.mockResolvedValueOnce(makeResponse(401, { message: 'OAuth 인증 실패' }));

    await expect(apiClient.post('/auth/google', { code: 'abc' })).rejects.toThrow();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('/auth/* 가 아닌 경로는 401 시 refresh 호출 (대조 케이스)', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockResolvedValue({ message: 'ok' });
    fetchMock
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const result = await apiClient.get<{ ok: boolean }>('/orders');

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });
});
