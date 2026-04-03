'use client'

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';

interface SafeHtmlProps {
  html: string;
  className?: string;
  style?: CSSProperties;
}

export default function SafeHtml({ html, className, style }: SafeHtmlProps) {
  const [clean, setClean] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('dompurify').then((mod) => {
        setClean(mod.default.sanitize(html));
      });
    }
  }, [html]);

  if (!clean) return <div className={className} style={style} suppressHydrationWarning />;

  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
