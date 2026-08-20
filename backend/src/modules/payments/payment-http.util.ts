import { BadGatewayException, LoggerService } from '@nestjs/common';

const DEFAULT_PAYMENT_REQUEST_TIMEOUT_MS = 8000;

export interface PaymentJsonRequestOptions {
  url: string;
  init: RequestInit;
  timeoutMs?: number;
  logger: Pick<LoggerService, 'error'>;
  errorLog: (response: Response) => string;
  errorMessage: string;
}

/**
 * Shared JSON HTTP transport for payment providers.
 *
 * Policy kept intentionally narrow: adapters own endpoints, payload parsing,
 * provider status-code semantics, and user-facing error messages. This helper
 * only applies the common 8s timeout, rejects non-2xx responses with the
 * adapter-provided BadGatewayException message, and parses JSON bodies.
 * Fetch/timeout rejections still propagate so provider adapters do not mask
 * transport failures differently than their previous direct fetch calls.
 */
export async function requestPaymentJson<T>(options: PaymentJsonRequestOptions): Promise<T> {
  const response = await fetch(options.url, {
    ...options.init,
    signal: options.init.signal ?? AbortSignal.timeout(options.timeoutMs ?? DEFAULT_PAYMENT_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    options.logger.error(options.errorLog(response));
    throw new BadGatewayException(options.errorMessage);
  }

  return (await response.json()) as T;
}

export async function requestPaymentResponse(options: PaymentJsonRequestOptions): Promise<Response> {
  const response = await fetch(options.url, {
    ...options.init,
    signal: options.init.signal ?? AbortSignal.timeout(options.timeoutMs ?? DEFAULT_PAYMENT_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    options.logger.error(options.errorLog(response));
    throw new BadGatewayException(options.errorMessage);
  }

  return response;
}
