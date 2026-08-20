import * as crypto from 'crypto';

export type PaymentHmacSignatureEncoding = 'base64' | 'hex';
export type PaymentHmacComparison = 'digest-bytes' | 'encoded-digest-string';

export interface VerifyPaymentHmacOptions {
  secret: string;
  signatureEncoding: PaymentHmacSignatureEncoding;
  comparison?: PaymentHmacComparison;
}

/**
 * Verify provider HMAC-SHA256 signatures without reserializing raw webhook bodies.
 *
 * Provider format policy:
 * - `digest-bytes`: compare raw digest bytes against a decoded hex/base64 signature
 *   (Toss base64, Inicis/Stripe hex).
 * - `encoded-digest-string`: compare the provider's encoded digest text byte-for-byte
 *   (Eximbay base64 text format).
 */
export function verifyPaymentHmacSha256(
  payload: unknown,
  signature: string,
  options: VerifyPaymentHmacOptions,
): boolean {
  if (!options.secret || !signature) return false;

  try {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = createExpectedBuffer(body, options);
    const provided = createProvidedBuffer(signature, options);

    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

function createExpectedBuffer(body: string, options: VerifyPaymentHmacOptions): Buffer {
  const hmac = crypto.createHmac('sha256', options.secret).update(body);
  if (options.comparison === 'encoded-digest-string') {
    return Buffer.from(hmac.digest(options.signatureEncoding), 'utf8');
  }
  return hmac.digest();
}

function createProvidedBuffer(signature: string, options: VerifyPaymentHmacOptions): Buffer {
  if (options.comparison === 'encoded-digest-string') {
    return Buffer.from(signature, 'utf8');
  }
  return Buffer.from(signature, options.signatureEncoding);
}
