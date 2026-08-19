import { BadRequestException } from '@nestjs/common';
import { NaverCommerceApiClient } from '../naver-commerce-api.client';

const ORIGINAL_ENV = process.env;

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('NaverCommerceApiClient', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NAVER_COMMERCE_APP_ID: 'test-client-id',
      NAVER_COMMERCE_APP_SECRET: '$2a$10$abcdefghijklmnopqrstuv',
      NAVER_COMMERCE_API_BASE_URL: 'https://naver-commerce.test/external',
      NAVER_COMMERCE_DETAIL_REQUEST_DELAY_MS: '0',
      NAVER_COMMERCE_RETRY_ATTEMPTS: '0',
      NAVER_COMMERCE_RETRY_BASE_DELAY_MS: '0',
    };
    jest.spyOn(Date, 'now').mockReturnValue(1643961623299);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  it('issues a form-encoded OAuth token request, searches products, and loads origin-product details', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 10_800 }))
      .mockResolvedValueOnce(
        jsonResponse({
          contents: [
            { originProductNo: 1001, name: '목록 상품 A' },
            { originProductNo: '1002', name: '목록 상품 B' },
          ],
          totalPages: 1,
          last: true,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ originProduct: { name: '상세 상품 A' } }))
      .mockResolvedValueOnce(jsonResponse({ originProduct: { name: '상세 상품 B' } }));
    global.fetch = fetchMock;

    const client = new NaverCommerceApiClient();
    const products = await client.fetchProductsWithDetails();

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      rowNumber: 1,
      detailProduct: { originProduct: { name: '상세 상품 A' } },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://naver-commerce.test/external/v1/oauth2/token',
      expect.objectContaining({ method: 'POST' }),
    );
    const tokenBody = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(tokenBody.get('client_id')).toBe('test-client-id');
    expect(tokenBody.get('timestamp')).toBe('1643961623299');
    expect(tokenBody.get('grant_type')).toBe('client_credentials');
    expect(tokenBody.get('type')).toBe('SELF');
    expect(tokenBody.get('client_secret_sign')).toBeTruthy();
    expect(tokenBody.get('client_secret_sign')).not.toContain(
      process.env.NAVER_COMMERCE_APP_SECRET as string,
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://naver-commerce.test/external/v1/products/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://naver-commerce.test/external/v2/products/origin-products/1001',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('returns product-level detail errors instead of aborting the whole sync', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 10_800 }))
      .mockResolvedValueOnce(
        jsonResponse({
          contents: [{ originProductNo: 1001, name: '목록 상품' }],
          totalPages: 1,
          last: true,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ message: 'detail failed' }, 500));

    const client = new NaverCommerceApiClient();
    const products = await client.fetchProductsWithDetails();

    expect(products[0]).toMatchObject({ detailProduct: null, error: 'detail failed' });
  });

  it('throttles detail requests after the first product so Naver does not reject 4+ bursts', async () => {
    process.env.NAVER_COMMERCE_DETAIL_REQUEST_DELAY_MS = '25';
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 10_800 }))
      .mockResolvedValueOnce(
        jsonResponse({
          contents: [
            { originProductNo: 1001 },
            { originProductNo: 1002 },
            { originProductNo: 1003 },
            { originProductNo: 1004 },
          ],
          totalPages: 1,
          last: true,
        }),
      )
      .mockResolvedValue(jsonResponse({ originProduct: { name: '상세 상품' } }));
    global.fetch = fetchMock;

    const client = new NaverCommerceApiClient();
    const products = await client.fetchProductsWithDetails();

    expect(products).toHaveLength(4);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(3);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 25);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('retries temporary Naver rate-limit errors before recording a product-level detail error', async () => {
    process.env.NAVER_COMMERCE_RETRY_ATTEMPTS = '2';
    process.env.NAVER_COMMERCE_RETRY_BASE_DELAY_MS = '0';
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 10_800 }))
      .mockResolvedValueOnce(
        jsonResponse({
          contents: [{ originProductNo: 1001 }, { originProductNo: 1002 }],
          totalPages: 1,
          last: true,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ originProduct: { name: '상세 상품 A' } }))
      .mockResolvedValueOnce(
        jsonResponse({ message: '요청이 많아 서비스를 일시적으로 사용할 수 없습니다.' }, 503, {
          'retry-after': '0',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ message: '요청이 많아 서비스를 일시적으로 사용할 수 없습니다.' }, 503),
      )
      .mockResolvedValueOnce(
        jsonResponse({ message: '요청이 많아 서비스를 일시적으로 사용할 수 없습니다.' }, 503),
      );
    global.fetch = fetchMock;

    const client = new NaverCommerceApiClient();
    const products = await client.fetchProductsWithDetails();

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      detailProduct: { originProduct: { name: '상세 상품 A' } },
    });
    expect(products[1]).toMatchObject({
      detailProduct: null,
      error: '요청이 많아 서비스를 일시적으로 사용할 수 없습니다.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('limits the product search size from NAVER_COMMERCE_MAX_SYNC_PRODUCTS', async () => {
    process.env.NAVER_COMMERCE_MAX_SYNC_PRODUCTS = '3';
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 10_800 }))
      .mockResolvedValueOnce(
        jsonResponse({
          contents: [
            { originProductNo: 1001 },
            { originProductNo: 1002 },
            { originProductNo: 1003 },
          ],
          totalPages: 10,
          last: false,
        }),
      )
      .mockResolvedValue(jsonResponse({ originProduct: { name: '상세 상품' } }));
    global.fetch = fetchMock;

    const client = new NaverCommerceApiClient();
    const products = await client.fetchProductsWithDetails();

    expect(products).toHaveLength(3);
    const searchBody = fetchMock.mock.calls[1][1].body as string;
    expect(JSON.parse(searchBody)).toMatchObject({ page: 1, size: 3 });
  });

  it('returns a safe error when the configured client secret cannot sign token requests', async () => {
    process.env.NAVER_COMMERCE_APP_SECRET = 'not-a-bcrypt-salt';
    const client = new NaverCommerceApiClient();

    await expect(client.fetchProductsWithDetails()).rejects.toThrow(
      '자격증명 형식이 올바르지 않습니다',
    );
  });

  it('explains that Naver rejected the server IP instead of mislabeling it as credentials', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ message: '호출이 허용되지 않은 IP입니다.' }, 401),
    );
    const client = new NaverCommerceApiClient();

    await expect(client.fetchProductsWithDetails()).rejects.toThrow(
      '서버 IP가 허용 목록에 없습니다',
    );
  });

  it('wraps token network failures in a safe gateway error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('socket includes secret-ish details'));
    const client = new NaverCommerceApiClient();

    await expect(client.fetchProductsWithDetails()).rejects.toThrow(
      '인증 토큰 요청에 실패했습니다',
    );
  });

  it('retries transient token network failures before failing the import', async () => {
    process.env.NAVER_COMMERCE_RETRY_ATTEMPTS = '1';
    process.env.NAVER_COMMERCE_RETRY_BASE_DELAY_MS = '0';
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 10_800 }))
      .mockResolvedValueOnce(jsonResponse({ contents: [], totalPages: 1, last: true }));
    global.fetch = fetchMock;

    const client = new NaverCommerceApiClient();

    await expect(client.fetchProductsWithDetails()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws a safe configuration error when credentials are missing', async () => {
    delete process.env.NAVER_COMMERCE_APP_ID;
    delete process.env.NAVER_COMMERCE_APP_SECRET;
    const client = new NaverCommerceApiClient();

    await expect(client.fetchProductsWithDetails()).rejects.toThrow(BadRequestException);
    await expect(client.fetchProductsWithDetails()).rejects.toThrow(
      '자격증명이 설정되지 않았습니다',
    );
  });
});
