const INLINE_CONTENT_TAGS = new Set(['b', 'strong', 'em', 'i', 'br', 'p', 'span']);
const RAW_TEXT_TAG_PATTERN = /<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_TAG_PATTERN = /<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*)?\/?\s*>/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeInlineHtml(html: string | null | undefined): string {
  if (!html) return '';

  const withoutRawTextBlocks = html.replace(RAW_TEXT_TAG_PATTERN, '');
  let sanitized = '';
  let cursor = 0;

  for (const match of withoutRawTextBlocks.matchAll(HTML_TAG_PATTERN)) {
    const [rawTag, rawName] = match;
    const index = match.index ?? 0;

    sanitized += escapeHtml(withoutRawTextBlocks.slice(cursor, index));

    const tagName = rawName.toLowerCase();
    if (INLINE_CONTENT_TAGS.has(tagName)) {
      if (tagName === 'br') {
        sanitized += '<br>';
      } else if (rawTag.startsWith('</')) {
        sanitized += `</${tagName}>`;
      } else {
        sanitized += `<${tagName}>`;
      }
    }

    cursor = index + rawTag.length;
  }

  sanitized += escapeHtml(withoutRawTextBlocks.slice(cursor));
  return sanitized;
}
