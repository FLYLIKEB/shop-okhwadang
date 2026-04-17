const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'auth',
  'secret',
  'apikey',
  'api_key',
  'creditcard',
  'credit_card',
  'cvv',
  'cvc',
  'cardnumber',
  'card_number',
];

export function sanitizeContext<T extends Record<string, unknown>>(context: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
