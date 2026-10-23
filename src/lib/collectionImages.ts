import type { PageBlock } from '@/lib/api';
import { fetchProducts } from '@/lib/api-server';
import { compactDisplayLabel } from '@/lib/collectionDisplay';

type ProductFilters = { attrs?: string; categoryId?: number };

function getProductFilters(href: unknown): ProductFilters | null {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return null;
  const url = new URL(href, 'https://ockhwadang.com');
  if (url.origin !== 'https://ockhwadang.com' || !/^\/(?:ko\/|en\/)?products\/?$/.test(url.pathname)) return null;

  const attrs = url.searchParams.get('attrs')?.trim() || undefined;
  const category = url.searchParams.get('categoryId');
  const categoryId = category === null ? undefined : Number(category);
  if (categoryId !== undefined && (!Number.isSafeInteger(categoryId) || categoryId <= 0)) return null;
  return attrs || categoryId ? { attrs, categoryId } : null;
}

export async function resolveCollectionImages(blocks: PageBlock[], locale: string): Promise<PageBlock[]> {
  const requests = new Map<string, Promise<string | undefined>>();

  function getImage(filters: ProductFilters | { q: string }) {
    const key = JSON.stringify(filters);
    let request = requests.get(key);
    if (!request) {
      request = fetchProducts({ ...filters, limit: 1, locale })
        .then(({ items }) => {
          const images = items[0]?.images ?? [];
          const thumbnail = images.find((image) => image.isThumbnail)
            ?? [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
          return thumbnail?.url || undefined;
        })
        .catch(() => undefined);
      requests.set(key, request);
    }
    return request;
  }

  return Promise.all(blocks.map(async (block) => {
    if (!block.is_visible || !['color_card_list', 'image_card_grid'].includes(block.type)
      || !Array.isArray(block.content.items)) return block;

    const items = await Promise.all(block.content.items.map(async (item: unknown) => {
      if (!item || typeof item !== 'object') return item;
      const content = item as Record<string, unknown>;
      if (typeof content.imageUrl === 'string' && content.imageUrl.trim()) return item;
      let filters: ProductFilters | null;
      try {
        filters = getProductFilters(content.href);
      } catch {
        return item;
      }
      if (!filters) return item;
      let imageUrl = await getImage(filters);
      const rawName = content.nameKo ?? content.name;
      const name = typeof rawName === 'string' ? compactDisplayLabel(rawName) : '';
      if (!imageUrl && name.length >= 2) imageUrl = await getImage({ q: name });
      return imageUrl ? { ...content, imageUrl } : item;
    }));
    return { ...block, content: { ...block.content, items } };
  }));
}
