import { describe, expect, it } from 'vitest';
import type { Page, ProductAttribute } from '@/lib/api';
import { compactDisplayLabel, compactProductSummary, getCollectionAttributeDescriptions } from '@/lib/collectionDisplay';

describe('collection display compaction', () => {
  it('removes redundant collection suffixes from filter labels', () => {
    expect(compactDisplayLabel('Jooni Collection')).toBe('Jooni');
    expect(compactDisplayLabel('Byeonpyeong Collection')).toBe('Byeonpyeong');
    expect(compactDisplayLabel('청수니 컬렉션')).toBe('청수니');
  });

  it('keeps meaningful parenthetical details while removing suffix-only wording', () => {
    expect(compactDisplayLabel('Heini (Black Clay)')).toBe('Heini (Black Clay)');
  });

  it('shortens product summaries without changing semantic parts', () => {
    expect(compactProductSummary('Fujian Zhuni · Xishi Shape · 120ml · Gongfu Tea')).toBe('Fujian Zhuni · Xishi · 120ml · Gongfu Tea');
    expect(compactProductSummary('Yixing Zisha · Flat shape · 200ml')).toBe('Yixing Zisha · Flat · 200ml');
  });
});

describe('collection attribute descriptions', () => {
  const page = {
    id: 1, slug: 'collection', title: 'Collection', is_published: true,
    blocks: [
      { id: 1, type: 'color_card_list', sort_order: 0, is_visible: true, content: { items: [
        { nameKo: '주니', description: 'Category-linked clay copy', href: '/products?categoryId=10' },
        { nameKo: '주니', description: '<b>Saved clay description</b>', href: '/ko/products?attrs=clay_type:junni' },
      ] } },
      { id: 2, type: 'image_card_grid', sort_order: 1, is_visible: true, content: { items: [
        { name: '서시', description: 'Saved shape description', href: '/products?attrs=teapot_shape:seoshi' },
      ] } },
    ],
  } satisfies Page;
  const attributes = [
    { id: 1, value: 'junni', displayValue: '주니', attributeTypeId: 1, sortOrder: 0, attributeType: { code: 'clay_type' } },
    { id: 2, value: 'seoshi', displayValue: '서시', attributeTypeId: 2, sortOrder: 1, attributeType: { code: 'teapot_shape' } },
  ] as ProductAttribute[];

  it('prefers exact attribute links and keeps the saved HTML copy', () => {
    expect(getCollectionAttributeDescriptions(page, attributes)).toEqual({ 1: '<b>Saved clay description</b>', 2: 'Saved shape description' });
  });

  it('matches saved labels for legacy category links without using category descriptions', () => {
    const legacyPage = { ...page, blocks: [{ ...page.blocks[0], content: { items: [page.blocks[0].content.items[0]] } }] };
    expect(getCollectionAttributeDescriptions(legacyPage, attributes)).toEqual({ 1: 'Category-linked clay copy' });
  });

  it('does not substitute descriptions for unregistered clay and shape values', () => {
    const missing = attributes.map((attribute, index) => ({ ...attribute, value: index === 0 ? 'old_duanni' : 'lianzi', displayValue: index === 0 ? '노단니' : '연자호' }));
    expect(getCollectionAttributeDescriptions(page, missing)).toEqual({});
  });

  it('ignores unpublished pages and hidden blocks', () => {
    expect(getCollectionAttributeDescriptions({ ...page, is_published: false }, attributes)).toEqual({});
    expect(getCollectionAttributeDescriptions({ ...page, blocks: page.blocks.map((block) => ({ ...block, is_visible: false })) }, attributes)).toEqual({});
    expect(getCollectionAttributeDescriptions(null, attributes)).toEqual({});
  });

  it('does not match the same label from the wrong attribute type', () => {
    expect(getCollectionAttributeDescriptions(page, [{ ...attributes[1], value: 'other', displayValue: '주니' }])).toEqual({});
  });

  it('skips malformed CMS items and invalid links', () => {
    const malformed = { ...page, blocks: [{ ...page.blocks[0], content: { items: [null, { description: 3 }, { nameKo: '주니', description: 'wrong', href: 'http://[' }] } }] };
    expect(getCollectionAttributeDescriptions(malformed, attributes)).toEqual({});
  });
});
