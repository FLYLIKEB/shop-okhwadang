import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const DEFAULT_NAVER_COMMERCE_API_BASE_URL = 'https://api.commerce.naver.com/external';
const DEFAULT_PAGE_SIZE = 100;
const MAX_SYNC_PRODUCTS = 500;

export interface NaverCommerceFetchedProduct {
  rowNumber: number;
  listProduct: Record<string, unknown>;
  detailProduct: Record<string, unknown> | null;
  error?: string;
}

interface NaverTokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
}

interface NaverSearchResponse {
  contents?: unknown;
  totalPages?: unknown;
  last?: unknown;
}

@Injectable()
export class NaverCommerceApiClient {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  async fetchProductsWithDetails(): Promise<NaverCommerceFetchedProduct[]> {
    this.assertConfigured();
    const listProducts = await this.searchAllProducts();
    const products: NaverCommerceFetchedProduct[] = [];

    for (let index = 0; index < listProducts.length; index += 1) {
      const listProduct = listProducts[index];
      const originProductNo = this.getNumberLike(listProduct, 'originProductNo');
      if (!originProductNo) {
        products.push({
          rowNumber: index + 1,
          listProduct,
          detailProduct: null,
          error: '네이버 상품 목록 응답에 원상품번호가 없어 상세 조회를 건너뜁니다.',
        });
        continue;
      }

      try {
        const detailProduct = await this.request<Record<string, unknown>>(
          `/v2/products/origin-products/${originProductNo}`,
          {
            method: 'GET',
          },
        );
        products.push({ rowNumber: index + 1, listProduct, detailProduct });
      } catch (err) {
        products.push({
          rowNumber: index + 1,
          listProduct,
          detailProduct: null,
          error: err instanceof Error ? err.message : '네이버 상품 상세 조회에 실패했습니다.',
        });
      }
    }

    return products;
  }

  private async searchAllProducts(): Promise<Array<Record<string, unknown>>> {
    const products: Array<Record<string, unknown>> = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && products.length < MAX_SYNC_PRODUCTS) {
      const response = await this.request<NaverSearchResponse>('/v1/products/search', {
        method: 'POST',
        body: JSON.stringify({ page, size: DEFAULT_PAGE_SIZE }),
        headers: { 'Content-Type': 'application/json' },
      });
      const contents = Array.isArray(response.contents) ? response.contents : [];
      products.push(...contents.filter(this.isRecord));

      const responseTotalPages =
        typeof response.totalPages === 'number' && Number.isFinite(response.totalPages)
          ? Math.max(1, Math.trunc(response.totalPages))
          : totalPages;
      totalPages = response.last === true ? page : responseTotalPages;
      page += 1;

      if (contents.length === 0) break;
    }

    return products.slice(0, MAX_SYNC_PRODUCTS);
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const token = await this.getAccessToken();
    return this.requestWithToken<T>(path, init, token, true);
  }

  private async requestWithToken<T>(
    path: string,
    init: RequestInit,
    token: string,
    allowAuthRetry: boolean,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.getBaseUrl()}${path}`, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new BadGatewayException(
        '네이버 커머스API 요청에 실패했습니다. 네트워크 상태를 확인해 주세요.',
      );
    }
    const payload = await this.parseResponseBody(response);

    if (response.status === 401 && allowAuthRetry && this.getErrorCode(payload) === 'GW.AUTHN') {
      this.accessToken = null;
      const refreshed = await this.getAccessToken();
      return this.requestWithToken<T>(path, init, refreshed, false);
    }

    if (!response.ok) {
      throw new BadGatewayException(
        this.safeErrorMessage(
          payload,
          `네이버 커머스API 요청에 실패했습니다. (HTTP ${response.status})`,
        ),
      );
    }

    return payload as T;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.accessTokenExpiresAt - now > 60_000) {
      return this.accessToken;
    }

    const clientId = this.getEnv('NAVER_COMMERCE_APP_ID');
    const clientSecret = this.getEnv('NAVER_COMMERCE_APP_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        '네이버 커머스API 자격증명이 설정되지 않았습니다. 관리자 환경변수를 확인해 주세요.',
      );
    }

    const timestamp = String(now);
    const clientSecretSign = this.generateSignature(clientId, clientSecret, timestamp);
    const body = new URLSearchParams({
      client_id: clientId,
      timestamp,
      client_secret_sign: clientSecretSign,
      grant_type: 'client_credentials',
      type: 'SELF',
    });

    let response: Response;
    try {
      response = await fetch(`${this.getBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
      });
    } catch {
      throw new BadGatewayException(
        '네이버 커머스API 인증 토큰 요청에 실패했습니다. 네트워크 상태를 확인해 주세요.',
      );
    }
    const payload = (await this.parseResponseBody(response)) as NaverTokenResponse;

    if (!response.ok || typeof payload.access_token !== 'string') {
      throw new BadGatewayException(
        this.safeErrorMessage(payload, '네이버 커머스API 인증 토큰 발급에 실패했습니다.'),
      );
    }

    const expiresInSeconds =
      typeof payload.expires_in === 'number' && Number.isFinite(payload.expires_in)
        ? payload.expires_in
        : 10_800;
    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt = now + Math.max(60, expiresInSeconds - 60) * 1000;
    return this.accessToken;
  }

  private assertConfigured(): void {
    if (!this.getEnv('NAVER_COMMERCE_APP_ID') || !this.getEnv('NAVER_COMMERCE_APP_SECRET')) {
      throw new BadRequestException(
        '네이버 커머스API 자격증명이 설정되지 않았습니다. 관리자 환경변수를 확인해 주세요.',
      );
    }
  }

  private generateSignature(clientId: string, clientSecret: string, timestamp: string): string {
    const password = `${clientId}_${timestamp}`;
    try {
      const hashed = bcrypt.hashSync(password, clientSecret);
      return Buffer.from(hashed, 'utf-8').toString('base64');
    } catch {
      throw new BadRequestException(
        '네이버 커머스API 자격증명 형식이 올바르지 않습니다. 관리자 환경변수를 확인해 주세요.',
      );
    }
  }

  private getBaseUrl(): string {
    return this.getEnv('NAVER_COMMERCE_API_BASE_URL') || DEFAULT_NAVER_COMMERCE_API_BASE_URL;
  }

  private getEnv(key: string): string {
    return (process.env[key] ?? '').trim();
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    if (response.status === 204) return {};
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { message: text };
    }
  }

  private safeErrorMessage(payload: unknown, fallback: string): string {
    const record = this.isRecord(payload) ? payload : {};
    const message = typeof record.message === 'string' ? record.message : fallback;
    return message
      .replace(this.getEnv('NAVER_COMMERCE_APP_ID'), '[REDACTED]')
      .replace(this.getEnv('NAVER_COMMERCE_APP_SECRET'), '[REDACTED]');
  }

  private getErrorCode(payload: unknown): string | null {
    if (!this.isRecord(payload)) return null;
    return typeof payload.code === 'string' ? payload.code : null;
  }

  private getNumberLike(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
