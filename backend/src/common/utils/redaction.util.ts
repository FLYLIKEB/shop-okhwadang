export const REDACTED_VALUE = '[REDACTED]';

export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'creditcard',
  'credit_card',
  'cvv',
  'cardnumber',
  'accountnumber',
  'bankaccount',
  'cardno',
  'refreshtoken',
  'secret',
  'api_key',
  'apikey',
  'apiKey',
  'rawpayment',
  'paymentraw',
  'rawresponse',
  'rawRequest',
  'rawResponse',
  'ssn',
  'residentregistrationnumber',
  'rrn',
  'birthdate',
  'email',
  'name',
  'recipientName',
  'recipient_name',
  'phone',
  'address',
  'clientSecret',
];

function normalizeField(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const EXACT_SENSITIVE_FIELDS = new Set(['email', 'name', 'recipientname', 'recipient_name']);

function isSensitiveField(key: string): boolean {
  const normalized = normalizeField(key);
  if (EXACT_SENSITIVE_FIELDS.has(normalized)) {
    return true;
  }
  return SENSITIVE_FIELDS
    .filter((field) => !EXACT_SENSITIVE_FIELDS.has(normalizeField(field)))
    .some((field) => normalized.includes(normalizeField(field)));
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    redacted[key] = isSensitiveField(key) ? REDACTED_VALUE : redactValue(nestedValue);
  }
  return redacted;
}

export function redactSensitiveFields<T extends Record<string, unknown>>(
  obj: T | null | undefined,
): T | null {
  if (!obj || typeof obj !== 'object') return null;
  return redactValue(obj) as T;
}
