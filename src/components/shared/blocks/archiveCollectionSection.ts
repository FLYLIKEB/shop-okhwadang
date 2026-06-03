'use client';

import type { SectionHeadingBlockContent } from '@/lib/api';

export function getSectionText(
  content: SectionHeadingBlockContent,
  fallback: {
    label: string;
    title: string;
    description?: string;
  },
) {
  return {
    label: content.sectionLabel || fallback.label,
    title: content.sectionTitle || fallback.title,
    description: content.sectionDesc || fallback.description,
  };
}
