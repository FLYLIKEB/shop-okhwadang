import type { Page, ProductAttribute } from '@/lib/api';

const COLLECTION_SUFFIX_PATTERN = /\s*(?:Collection|컬렉션)\s*$/i;
const ENGLISH_SHAPE_SUFFIX_PATTERN = /\s+shape\b/gi;

export function compactDisplayLabel(label: string): string {
  return label
    .replace(COLLECTION_SUFFIX_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCompactCollectionLabel(collection: { name: string }): string {
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

export function getCollectionAttributeDescriptions(page: Page | null, attributes: ProductAttribute[]): Record<number, string> {
  if (!page?.is_published) return {};

  const items = page.blocks.filter((block) => block.is_visible).flatMap((block) => {
    const code = block.type === 'color_card_list' ? 'clay_type'
      : block.type === 'image_card_grid' ? 'teapot_shape' : null;
    if (!code || !Array.isArray(block.content.items)) return [];
    return block.content.items.flatMap((item: unknown) => {
      if (!item || typeof item !== 'object' || !('description' in item)
        || typeof item.description !== 'string' || !item.description.trim()) return [];
      const labels = ['name', 'nameKo', 'nameEn'].flatMap((key) => {
        const value = (item as Record<string, unknown>)[key];
        return typeof value === 'string' ? [compactDisplayLabel(value).toLowerCase()] : [];
      });
      let filters: string[] = [];
      if ('href' in item && typeof item.href === 'string') {
        try {
          filters = new URL(item.href, 'https://ockhwadang.com').searchParams.get('attrs')?.split(',') ?? [];
        } catch {
          return [];
        }
      }
      return [{ code, description: item.description, labels, filters }];
    });
  });

  const descriptions: Record<number, string> = {};
  for (const attribute of attributes) {
    const candidates = items.filter((item) => item.code === attribute.attributeType?.code);
    const match = candidates.find((item) => item.filters.includes(`${item.code}:${attribute.value}`))
      ?? candidates.find((item) => item.labels.includes(compactDisplayLabel(attribute.displayValue ?? attribute.value).toLowerCase()));
    if (match) descriptions[attribute.id] = match.description;
  }
  return descriptions;
}
