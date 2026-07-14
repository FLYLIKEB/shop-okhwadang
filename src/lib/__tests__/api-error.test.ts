import { describe, expect, it } from 'vitest';
import {
  ApiHttpError,
  createApiHttpError,
  isEmptyApiResponse,
  normalizeApiErrorMessage,
} from '@/lib/api-error';

describe('shared API error contract', () => {
  it('normalizes array-based validation messages into one string', () => {
    expect(normalizeApiErrorMessage(['필수입니다.', '형식이 올바르지 않습니다.'], 400)).toBe(
      '필수입니다., 형식이 올바르지 않습니다.',
    );
  });

  it('maps backend Forbidden responses to the shared Korean message', () => {
    expect(normalizeApiErrorMessage('Forbidden', 403)).toBe('접근 권한이 없습니다.');
  });

  it('builds typed HTTP errors from response payloads', async () => {
    const error = await createApiHttpError(
      new Response(JSON.stringify({ message: '설정을 불러오지 못했습니다.' }), { status: 500 }),
    );

    expect(error).toBeInstanceOf(ApiHttpError);
    expect(error.message).toBe('설정을 불러오지 못했습니다.');
    expect(error.status).toBe(500);
  });

  it('detects empty API responses consistently', () => {
    expect(isEmptyApiResponse(new Response(null, { status: 204 }))).toBe(true);
    expect(
      isEmptyApiResponse(
        new Response(JSON.stringify({ ok: true }), { headers: { 'content-length': '0' } }),
      ),
    ).toBe(true);
  });
});
