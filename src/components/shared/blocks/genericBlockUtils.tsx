'use client';

import { sanitizeInlineHtml } from '@/lib/sanitize-inline-html';

export function InlineHtmlText({
  html,
  className,
}: {
  html: string | null | undefined;
  className: string;
}) {
  const sanitized = sanitizeInlineHtml(html);

  if (!sanitized) return null;

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

export function getHeadingId(prefix: string, title?: string) {
  const suffix = title?.trim().replace(/\s+/g, '-').toLowerCase() || 'section';
  return `${prefix}-${suffix}`;
}
