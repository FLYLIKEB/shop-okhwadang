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
  'phone',
  'address',
  'clientSecret',
];

function normalizeField(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveField(key: string): boolean {
  const normalized = normalizeField(key);
  return SENSITIVE_FIELDS.some((field) => normalized.includes(normalizeField(field)));
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
