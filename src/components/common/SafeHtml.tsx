import DOMPurify from 'isomorphic-dompurify';
import type { CSSProperties } from 'react';

interface SafeHtmlProps {
  html: string;
  className?: string;
  style?: CSSProperties;
}

// Content is sanitized by DOMPurify before rendering — XSS safe
export default function SafeHtml({ html, className, style }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(html);
  // eslint-disable-next-line react/no-danger
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
