/**
 * Returns true only for safe relative paths (starting with /).
 * Blocks javascript: protocol, protocol-relative URLs (//), and empty strings.
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('/') && !url.startsWith('//');
}
