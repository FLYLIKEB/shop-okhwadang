export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'creditcard',
  'credit_card',
  'cvv',
  'cardnumber',
  'accountnumber',
  'bankaccount',
  'cardno',
  'refreshtoken',
  'secret',
  'ssn',
  'phone',
  'address',
  'clientSecret',
];

export function redactSensitiveFields<T extends Record<string, unknown>>(
  obj: T | null | undefined,
): T | null {
  if (!obj || typeof obj !== 'object') return null;
  const redacted: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some((f) => k.toLowerCase().includes(f))) {
      redacted[k] = '[REDACTED]';
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      redacted[k] = redactSensitiveFields(v as Record<string, unknown>);
    } else {
      redacted[k] = v;
    }
  }
  return redacted as T;
}