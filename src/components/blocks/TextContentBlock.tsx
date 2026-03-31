'use client';

import { useEffect, useRef } from 'react';
import type { TextContentContent } from '@/lib/api';

interface Props {
  content: TextContentContent;
}

export default function TextContentBlock({ content }: Props) {
  const { html, textAlign = 'center' } = content;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    import('dompurify').then(({ default: DOMPurify }) => {
      if (ref.current) {
        ref.current.innerHTML = DOMPurify.sanitize(html);
      }
    });
  }, [html]);

  return (
    <section className="my-8">
      <hr className="border-border" />
      <div ref={ref} className="prose max-w-none py-6" style={{ textAlign }} />
      <hr className="border-border" />
    </section>
  );
}
