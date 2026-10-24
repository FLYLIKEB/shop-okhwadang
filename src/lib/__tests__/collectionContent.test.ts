import { describe, expect, it } from 'vitest';
import type { PageBlock } from '@/lib/api';
import type { AttributeFilterGroup } from '@/lib/attributeFilterOptions';
import { normalizeCollectionBlocks } from '@/lib/collectionContent';

const groups: AttributeFilterGroup[] = [
  { code: 'clay_type', label: '니료', options: [
    { value: 'old_zini', label: '노자니', productCount: 1 },
    { value: 'jani', label: '자니', productCount: 1 },
    { value: 'junni', label: '주니', productCount: 1 },
    { value: 'danji', label: '단니', productCount: 1 },
    { value: 'old_duanni', label: '노단니', productCount: 1 },
  ] },
  { code: 'teapot_shape', label: '모양', options: [
    { value: 'seoshi', label: '서시호', productCount: 1 },
    { value: 'juhu', label: '주형호', productCount: 1 },
  ] },
];

function block(type: PageBlock['type'], items: Record<string, unknown>[], overrides: Partial<PageBlock> = {}): PageBlock {
  return { id: 1, type, sort_order: 0, is_visible: true, content: { items }, ...overrides };
}

describe('normalizeCollectionBlocks', () => {
  it('deduplicates category and attribute names while keeping first copy, URL and a later supplied image', () => {
    const first = { id: 'first', nameKo: '주니', description: '<b>Saved</b>', href: '/products?attrs=clay_type:junni' };
    const input = [block('color_card_list', [first, { id: 'second', name: '주니 (Zhuni)', href: '/products?categoryId=10', imageUrl: '/real.jpg' }])];
    const before = structuredClone(input);
    const output = normalizeCollectionBlocks(input, 'ko', groups);
    expect(output[0].content.items).toEqual([{ ...first, name: '주니', nameEn: '', hrefLabel: '주니 작품 보기', imageUrl: '/real.jpg' }]);
    expect(input).toEqual(before);
  });

  it('uses authoritative Korean shape labels and removes romanized duplicates', () => {
    const input = [block('image_card_grid', [
      { name: 'seoshi', href: '/products?attrs=teapot_shape:seoshi' },
      { name: '서시 (Seoshi)', href: '/products?categoryId=22' },
      { name: '주형 (Zhuxing)', href: '/products?categoryId=20' },
    ])];
    expect(normalizeCollectionBlocks(input, 'ko', groups)[0].content.items).toEqual([
      { name: '서시호', nameKo: '서시호', nameEn: '', href: '/products?attrs=teapot_shape:seoshi', hrefLabel: '서시호 작품 보기' },
      { name: '주형호', nameKo: '주형호', nameEn: '', href: '/products?categoryId=20', hrefLabel: '주형호 작품 보기' },
    ]);
  });

  it('maps the known Zisha alias to 자니 without merging distinct clay subtypes', () => {
    const input = [block('color_card_list', [
      { nameKo: '자사', nameEn: 'Zisha', href: '/products?categoryId=11' },
      { nameKo: '자니', href: '/products?attrs=clay_type:jani' },
      { nameKo: '노자니', href: '/products?attrs=clay_type:old_zini' },
      { nameKo: '단니', href: '/products?attrs=clay_type:danji' },
      { nameKo: '노단니', href: '/products?attrs=clay_type:old_duanni' },
      { nameKo: '희귀노자니', nameEn: 'RareZisha', href: '/products?categoryId=99' },
    ])];
    const output = normalizeCollectionBlocks(input, 'ko', groups);
    expect((output[0].content.items as { name: string }[]).map((item) => item.name)).toEqual(['자니', '노자니', '단니', '노단니', '희귀노자니']);
  });

  it('keeps English CMS names and labels while still deduplicating canonically', () => {
    const first = { name: 'Xishi Collection', nameKo: '서시', nameEn: 'Xishi', hrefLabel: 'Explore Xishi', href: '/en/products?attrs=teapot_shape:seoshi' };
    const input = [block('image_card_grid', [first, { name: '서시호', href: '/products?categoryId=22' }])];
    expect(normalizeCollectionBlocks(input, 'en', groups)[0].content.items).toEqual([first]);
  });

  it('deduplicates across visible blocks but preserves unknown labels and different kinds', () => {
    const hidden = block('color_card_list', [{ nameKo: '주니' }], { id: 1, is_visible: false });
    const input = [hidden,
      block('color_card_list', [{ nameKo: '주니' }, { nameKo: '별도 흙' }, { nameKo: '다른 흙' }], { id: 2 }),
      block('color_card_list', [{ nameKo: '주니 컬렉션' }], { id: 3 }),
      block('image_card_grid', [{ name: '주니' }], { id: 4 }),
    ];
    const output = normalizeCollectionBlocks(input, 'ko', groups);
    expect(output[0]).toBe(hidden);
    expect(output[1].content.items).toHaveLength(3);
    expect(output[2].content.items).toEqual([]);
    expect(output[3].content.items).toHaveLength(1);
  });
});
