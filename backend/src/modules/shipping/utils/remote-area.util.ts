const REMOTE_ZIPCODE_PREFIXES = ['53', '54', '63'] as const;

export function normalizeZipcode(input: string): string {
  return input.replace(/\D/g, '');
}

export function isRemoteAreaZipcode(zipcode: string): boolean {
  const normalized = normalizeZipcode(zipcode);
  if (normalized.length < 2) return false;

  return REMOTE_ZIPCODE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
