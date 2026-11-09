'use client'

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '@/components/ui/utils';

interface SafeHtmlProps {
  html: string;
  className?: string;
  style?: CSSProperties;
}

export default function SafeHtml({ html, className, style }: SafeHtmlProps) {
  const [clean, setClean] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    import('dompurify').then((mod) => {
      const DOMPurify = mod.default ?? mod;
      const template = document.createElement('template');
      template.innerHTML = DOMPurify.sanitize(html);
      template.content.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
        if (className?.split(/\s+/).includes('product-detail-html')) {
          // Remove inline priority so the scoped description rules also win over editor !important.
          for (const property of Array.from(element.style)) {
            if (/^(font(?:-.+)?|line-height|letter-spacing|(?:min-|max-)?(?:width|height)|margin(?:-.+)?|display)$/.test(property)) {
              element.style.setProperty(property, element.style.getPropertyValue(property));
            }
          }
        }
        if (element.closest('svg, img, video, iframe, canvas')) return;
        for (const property of Array.from(element.style)) {
          // Let the dark theme override authored colors without changing light-mode content.
          if (/^(color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?)$/.test(property)) {
            element.style.setProperty(property, element.style.getPropertyValue(property));
          }
        }
      });
      setClean(template.innerHTML);
    });
  }, [html, className]);

  if (!clean) return <div className={cn('theme-rich-html', className)} style={style} suppressHydrationWarning />;

  return <div className={cn('theme-rich-html', className)} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
