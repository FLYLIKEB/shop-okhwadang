import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageBlock, Product, ProductImage, ProductListResponse } from '@/lib/api';
import { fetchProducts } from '@/lib/api-server';
import { resolveCollectionImages } from '@/lib/collectionImages';

vi.mock('@/lib/api-server', () => ({ fetchProducts: vi.fn() }));

function block(type: PageBlock['type'], items: Record<string, unknown>[], overrides: Partial<PageBlock> = {}): PageBlock {
  return { id: 1, type, sort_order: 0, is_visible: true, content: { sectionTitle: 'Collection', items }, ...overrides };
}

function result(images: Partial<ProductImage>[]): ProductListResponse {
  return { items: [{ id: 1, images } as Product], total: 1, page: 1, limit: 1 };
}

beforeEach(() => vi.resetAllMocks());

describe('resolveCollectionImages', () => {
  it('keeps explicit CMS photography without looking up products', async () => {
    const input = [block('color_card_list', [{ nameKo: '주니', imageUrl: '/cms.jpg', href: '/products?categoryId=10' }])];
    expect(await resolveCollectionImages(input, 'ko')).toEqual(input);
    expect(fetchProducts).not.toHaveBeenCalled();
  });

  it('resolves original thumbnail URLs using item filters and deduplicates matching requests across block types', async () => {
    vi.mocked(fetchProducts).mockResolvedValue(result([
      { url: '/other.jpg', sortOrder: 0, isThumbnail: false },
      { url: '/original.jpg', thumbnailUrl: '/small.webp', sortOrder: 1, isThumbnail: true },
    ]));
    const input = [
      block('color_card_list', [{ id: 'clay', description: '<b>Saved copy</b>', href: '/products?attrs=clay_type%3Azuni&categoryId=10' }]),
      block('image_card_grid', [{ id: 'shape', href: '/ko/products?categoryId=10&attrs=clay_type%3Azuni' }], { id: 2 }),
    ];
    const before = structuredClone(input);
    const output = await resolveCollectionImages(input, 'ko');
    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(fetchProducts).toHaveBeenCalledWith({ categoryId: 10, attrs: 'clay_type:zuni', limit: 1, locale: 'ko' });
    expect(output[0].content.items).toEqual([{ id: 'clay', description: '<b>Saved copy</b>', href: '/products?attrs=clay_type%3Azuni&categoryId=10', imageUrl: '/original.jpg' }]);
    expect(output[1].content.items).toEqual([{ id: 'shape', href: '/ko/products?categoryId=10&attrs=clay_type%3Azuni', imageUrl: '/original.jpg' }]);
    expect(input).toEqual(before);
  });

  it('uses gallery order when the matching product has no thumbnail flag', async () => {
    vi.mocked(fetchProducts).mockResolvedValue(result([{ url: '/later.jpg', sortOrder: 3 }, { url: '/first.jpg', sortOrder: 1 }]));
    const output = await resolveCollectionImages([block('image_card_grid', [{ href: '/en/products?attrs=teapot_shape:xishi' }])], 'en');
    expect(fetchProducts).toHaveBeenCalledWith({ attrs: 'teapot_shape:xishi', categoryId: undefined, limit: 1, locale: 'en' });
    expect(output[0].content.items).toEqual([{ href: '/en/products?attrs=teapot_shape:xishi', imageUrl: '/first.jpg' }]);
  });

  it('uses the saved collection name only when the valid filter has no photo and deduplicates that fallback', async () => {
    vi.mocked(fetchProducts)
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 1 })
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([{ url: '/zhuni-original.jpg', isThumbnail: true }]));
    const input = [block('color_card_list', [
      { nameKo: ' 주니 컬렉션 ', href: '/products?attrs=clay_type:junni' },
      { name: '주니', href: '/products?categoryId=10' },
    ])];
    const output = await resolveCollectionImages(input, 'ko');
    expect(fetchProducts).toHaveBeenCalledTimes(3);
    expect(fetchProducts).toHaveBeenLastCalledWith({ q: '주니', limit: 1, locale: 'ko' });
    expect(output[0].content.items).toEqual([
      { nameKo: ' 주니 컬렉션 ', href: '/products?attrs=clay_type:junni', imageUrl: '/zhuni-original.jpg' },
      { name: '주니', href: '/products?categoryId=10', imageUrl: '/zhuni-original.jpg' },
    ]);
  });

  it('never searches by name when the primary filter already supplies a photo', async () => {
    vi.mocked(fetchProducts).mockResolvedValue(result([{ url: '/filtered.jpg', isThumbnail: true }]));
    const output = await resolveCollectionImages([block('color_card_list', [{ nameKo: '주니', href: '/products?categoryId=10' }])], 'ko');
    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(fetchProducts).toHaveBeenCalledWith({ categoryId: 10, attrs: undefined, limit: 1, locale: 'ko' });
    expect(output[0].content.items).toEqual([{ nameKo: '주니', href: '/products?categoryId=10', imageUrl: '/filtered.jpg' }]);
  });

  it('keeps text when both filtered and name searches are empty', async () => {
    vi.mocked(fetchProducts).mockResolvedValue({ items: [], total: 0, page: 1, limit: 1 });
    const input = [block('color_card_list', [{ nameKo: '주니', href: '/products?categoryId=10' }])];
    expect(await resolveCollectionImages(input, 'ko')).toEqual(input);
    expect(fetchProducts).toHaveBeenCalledTimes(2);
  });

  it('preserves content when products are missing, image lists are empty, or the API fails', async () => {
    vi.mocked(fetchProducts)
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 1 })
      .mockResolvedValueOnce(result([]))
      .mockRejectedValueOnce(new Error('unavailable'));
    const input = [block('color_card_list', [1, 2, 3].map((id) => ({ href: `/products?categoryId=${id}`, description: 'Keep this' })))];
    expect(await resolveCollectionImages(input, 'ko')).toEqual(input);
  });

  it('never fetches external links, unrelated routes, invalid categories, unfiltered products or invisible blocks', async () => {
    const hrefs = ['https://example.com/products?categoryId=1', '//example.com/products?categoryId=1', '/\\example.com/products?categoryId=1', '/journal?categoryId=1', '/products', '/products?categoryId=-1', '/products?categoryId=wrong', '/products?categoryId=0'];
    const input = [
      block('color_card_list', hrefs.map((href) => ({ href, nameKo: '주니' }))),
      block('image_card_grid', [{ href: '/products?categoryId=1' }], { is_visible: false }),
      block('person_card_list', [{ href: '/products?categoryId=1' }]),
    ];
    expect(await resolveCollectionImages(input, 'ko')).toEqual(input);
    expect(fetchProducts).not.toHaveBeenCalled();
  });
});
