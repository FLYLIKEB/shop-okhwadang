import { BadGatewayException } from '@nestjs/common';
import { requestPaymentJson, requestPaymentResponse } from '../payment-http.util';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('payment HTTP helpers', () => {
  const logger = { error: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies a timeout signal and returns parsed JSON for 2xx responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'DONE' }),
    });

    const result = await requestPaymentJson<{ status: string }>({
      url: 'https://provider.example/confirm',
      init: {
        method: 'POST',
        headers: {
          Authorization: 'Basic token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey: 'pk_123' }),
      },
      logger,
      errorLog: (response) => `Provider failed: status=${response.status}`,
      errorMessage: 'Provider API error',
    });

    expect(result).toEqual({ status: 'DONE' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://provider.example/confirm',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Basic token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ paymentKey: 'pk_123' }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('preserves caller-provided signals instead of replacing them', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    await requestPaymentJson({
      url: 'https://provider.example/custom-signal',
      init: { method: 'GET', signal: controller.signal },
      logger,
      errorLog: (response) => `Provider failed: status=${response.status}`,
      errorMessage: 'Provider API error',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://provider.example/custom-signal',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('logs and throws the adapter-provided BadGatewayException on non-2xx JSON requests', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(requestPaymentJson({
      url: 'https://provider.example/down',
      init: { method: 'POST' },
      logger,
      errorLog: (response) => `Provider failed: status=${response.status}`,
      errorMessage: 'Provider API error',
    })).rejects.toThrow(BadGatewayException);

    expect(logger.error).toHaveBeenCalledWith('Provider failed: status=503');
  });

  it('returns raw Response for helpers that keep provider-specific parsing in adapters', async () => {
    const response = { ok: true, json: async () => ({ access_token: 'token' }) } as Response;
    mockFetch.mockResolvedValueOnce(response);

    await expect(requestPaymentResponse({
      url: 'https://provider.example/raw',
      init: { method: 'POST', headers: { Authorization: 'Bearer token' } },
      logger,
      errorLog: (result) => `Provider failed: status=${result.status}`,
      errorMessage: 'Provider API error',
    })).resolves.toBe(response);
  });
});
