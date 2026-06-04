import type { Collection } from '@/lib/api';

const COLLECTION_SUFFIX_PATTERN = /\s*(?:Collection|컬렉션)\s*$/i;
const ENGLISH_SHAPE_SUFFIX_PATTERN = /\s+shape\b/gi;

export function compactDisplayLabel(label: string): string {
  return label
    .replace(COLLECTION_SUFFIX_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCompactCollectionLabel(collection: Pick<Collection, 'name'>): string {
  return compactDisplayLabel(collection.name);
}

export function compactProductSummary(summary: string): string {
  return summary
    .split('·')
    .map((part) => (
      compactDisplayLabel(part)
        .replace(ENGLISH_SHAPE_SUFFIX_PATTERN, '')
        .replace(/\s+/g, ' ')
        .trim()
    ))
    .filter(Boolean)
    .join(' · ');
}
