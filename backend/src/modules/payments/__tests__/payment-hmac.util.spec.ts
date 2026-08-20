import * as crypto from 'crypto';
import { verifyPaymentHmacSha256 } from '../payment-hmac.util';

describe('verifyPaymentHmacSha256', () => {
  it('verifies decoded base64 digest bytes without reserializing raw payloads', () => {
    const raw = '{ "eventType": "PAYMENT_STATUS_CHANGED" }';
    const signature = crypto.createHmac('sha256', 'secret').update(raw).digest('base64');

    expect(verifyPaymentHmacSha256(raw, signature, {
      secret: 'secret',
      signatureEncoding: 'base64',
    })).toBe(true);
    expect(verifyPaymentHmacSha256({ eventType: 'PAYMENT_STATUS_CHANGED' }, signature, {
      secret: 'secret',
      signatureEncoding: 'base64',
    })).toBe(false);
  });

  it('verifies decoded hex digest bytes and fails closed on malformed signatures', () => {
    const payload = { tid: 'StdpayCARD20260101000000', resultCode: '0000' };
    const signature = crypto.createHmac('sha256', 'sign-key').update(JSON.stringify(payload)).digest('hex');

    expect(verifyPaymentHmacSha256(payload, signature, {
      secret: 'sign-key',
      signatureEncoding: 'hex',
    })).toBe(true);
    expect(verifyPaymentHmacSha256(payload, 'not-hex', {
      secret: 'sign-key',
      signatureEncoding: 'hex',
    })).toBe(false);
  });

  it('can compare provider encoded base64 digest strings exactly', () => {
    const payload = { rescode: '0000', transaction_id: 'EXIMBAY-TX-1' };
    const signature = crypto.createHmac('sha256', 'webhook-secret').update(JSON.stringify(payload)).digest('base64');

    expect(verifyPaymentHmacSha256(payload, signature, {
      secret: 'webhook-secret',
      signatureEncoding: 'base64',
      comparison: 'encoded-digest-string',
    })).toBe(true);
    expect(verifyPaymentHmacSha256(payload, Buffer.from(signature, 'base64').toString('base64url'), {
      secret: 'webhook-secret',
      signatureEncoding: 'base64',
      comparison: 'encoded-digest-string',
    })).toBe(false);
  });

  it('returns false when secret or signature is missing', () => {
    expect(verifyPaymentHmacSha256('body', 'signature', {
      secret: '',
      signatureEncoding: 'base64',
    })).toBe(false);
    expect(verifyPaymentHmacSha256('body', '', {
      secret: 'secret',
      signatureEncoding: 'base64',
    })).toBe(false);
  });
});
