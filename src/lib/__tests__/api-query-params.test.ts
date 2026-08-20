import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminSettingsApi,
  announcementBarsApi,
  apiClient,
  bannersApi,
  couponsApi,
  faqsApi,
  noticesApi,
  promotionsApi,
  settingsApi,
} from '@/lib/api';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient query params', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('serializes undefined, empty, Korean, spaces, plus, and ampersand values into the exact URL', async () => {
    await apiClient.get('/query-check', {
      params: {
        locale: 'ko',
        status: '사용 가능',
        group: '기본 설정',
        plus: 'a+b',
        amp: 'a&b',
        empty: '',
        missing: undefined,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/query-check?locale=ko&status=%EC%82%AC%EC%9A%A9+%EA%B0%80%EB%8A%A5&group=%EA%B8%B0%EB%B3%B8+%EC%84%A4%EC%A0%95&plus=a%2Bb&amp=a%26b&empty=',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('omits the query delimiter when every param value is missing', async () => {
    await apiClient.get('/query-check', {
      params: { locale: undefined, status: undefined, group: undefined },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/query-check',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('feature API query param boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes storefront query values through ApiClient params', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([]);

    await bannersApi.getList('ko KR');
    await couponsApi.getList('사용+가능&대기');
    await faqsApi.getList('차 도구', 'ko');
    await noticesApi.getList('ko KR');
    await noticesApi.getOne(7, 'ko KR');
    await promotionsApi.getList('ko KR');
    await promotionsApi.getOne(8, 'ko KR');
    await settingsApi.getAll('기본 설정');
    await announcementBarsApi.getActive('ko KR');

    expect(getSpy).toHaveBeenNthCalledWith(1, '/banners', { params: { locale: 'ko KR' } });
    expect(getSpy).toHaveBeenNthCalledWith(2, '/coupons', {
      params: { status: '사용+가능&대기' },
    });
    expect(getSpy).toHaveBeenNthCalledWith(3, '/faqs', {
      params: { category: '차 도구', locale: 'ko' },
    });
    expect(getSpy).toHaveBeenNthCalledWith(4, '/notices', { params: { locale: 'ko KR' } });
    expect(getSpy).toHaveBeenNthCalledWith(5, '/notices/7', { params: { locale: 'ko KR' } });
    expect(getSpy).toHaveBeenNthCalledWith(6, '/promotions', { params: { locale: 'ko KR' } });
    expect(getSpy).toHaveBeenNthCalledWith(7, '/promotions/8', {
      params: { locale: 'ko KR' },
    });
    expect(getSpy).toHaveBeenNthCalledWith(8, '/settings', {
      params: { group: '기본 설정' },
    });
    expect(getSpy).toHaveBeenNthCalledWith(9, '/announcement-bars', {
      params: { locale: 'ko KR' },
    });
  });

  it('omits params for optional storefront query values that are absent', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([]);

    await bannersApi.getList();
    await couponsApi.getList();
    await faqsApi.getList();
    await noticesApi.getList();
    await noticesApi.getOne(7);
    await promotionsApi.getList();
    await promotionsApi.getOne(8);
    await settingsApi.getAll();
    await announcementBarsApi.getActive();

    expect(getSpy).toHaveBeenNthCalledWith(1, '/banners', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(2, '/coupons', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(3, '/faqs', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(4, '/notices', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(5, '/notices/7', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(6, '/promotions', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(7, '/promotions/8', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(8, '/settings', { params: undefined });
    expect(getSpy).toHaveBeenNthCalledWith(9, '/announcement-bars', { params: undefined });
  });

  it('passes admin settings group through ApiClient params', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([]);

    await adminSettingsApi.getAll('기본 설정');
    await adminSettingsApi.getAll();

    expect(getSpy).toHaveBeenNthCalledWith(1, '/admin/settings', {
      params: { group: '기본 설정' },
    });
    expect(getSpy).toHaveBeenNthCalledWith(2, '/admin/settings', { params: undefined });
  });
});
