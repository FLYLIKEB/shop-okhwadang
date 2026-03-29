'use client';

import { useEffect, useRef } from 'react';
import type { TextContentContent } from '@/lib/api';

interface Props {
  content: TextContentContent;
}

export default function TextContentBlock({ content }: Props) {
  const { html } = content;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // DOMPurify is browser-only — dynamic import avoids SSR/jsdom conflicts
    import('dompurify').then(({ default: DOMPurify }) => {
      if (ref.current) {
        ref.current.innerHTML = DOMPurify.sanitize(html);
      }
    });
  }, [html]);

  return <section ref={ref} className="prose max-w-none" />;
}
