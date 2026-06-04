import { banners, pageBlocks, pages, promotions } from './seed-data';

function expectEnglish(value: string): void {
  expect(value).toEqual(expect.any(String));
  expect(value.trim()).not.toBe('');
  expect(/[가-힣]/.test(value)).toBe(false);
}

describe('seed-data English promotion content', () => {
  it('provides English fields for every promotion rendered on /en/event', () => {
    expect(promotions.length).toBeGreaterThan(0);

    for (const promotion of promotions) {
      expectEnglish(promotion.titleEn);
      expectEnglish(promotion.descriptionEn);
    }
  });

  it('provides English title fields for every banner', () => {
    expect(banners.length).toBeGreaterThan(0);

    for (const banner of banners) {
      expectEnglish(banner.titleEn);
    }
  });
});

describe('archive/collection CMS page seed data', () => {
  it('publishes archive and collection pages for CMS rendering', () => {
    expect(pages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'archive',
          title: '아카이브',
          titleEn: 'Archive',
          isPublished: true,
        }),
        expect.objectContaining({
          slug: 'collection',
          title: '콜렉션',
          titleEn: 'Collection',
          isPublished: true,
        }),
      ]),
    );
  });

  it('seeds archive body blocks between CMS-managed hero and CTA blocks', () => {
    const archiveBlocks = pageBlocks
      .filter((block) => block.pageSlug === 'archive')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    expect(archiveBlocks.map((block) => `${block.sortOrder}:${block.type}`)).toEqual([
      '-1:hero_banner',
      '0:color_card_list',
      '1:timeline_list',
      '2:person_card_list',
      '99:promotion_banner',
    ]);
  });



  it('inlines item arrays for generic archive and collection blocks', () => {
    const genericBlocks = pageBlocks.filter((block) =>
      ['color_card_list', 'timeline_list', 'person_card_list', 'image_card_grid'].includes(block.type),
    );

    expect(genericBlocks.length).toBeGreaterThan(0);
    for (const block of genericBlocks) {
      const content = block.content as unknown as { items?: unknown[]; layout?: string; columns?: number };
      expect(Array.isArray(content.items)).toBe(true);
      expect(content.items?.length).toBeGreaterThan(0);
    }

    const archiveColorBlock = pageBlocks.find((block) => block.pageSlug === 'archive' && block.type === 'color_card_list');
    expect((archiveColorBlock?.content as unknown as { layout?: string }).layout).toBe('alternating');

    const collectionColorBlock = pageBlocks.find((block) => block.pageSlug === 'collection' && block.type === 'color_card_list');
    expect((collectionColorBlock?.content as unknown as { layout?: string }).layout).toBe('grid-3');

    const imageGridBlock = pageBlocks.find((block) => block.pageSlug === 'collection' && block.type === 'image_card_grid');
    expect((imageGridBlock?.content as unknown as { columns?: number }).columns).toBe(3);
  });

  it('seeds collection body blocks between CMS-managed hero and CTA blocks', () => {
    const collectionBlocks = pageBlocks
      .filter((block) => block.pageSlug === 'collection')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    expect(collectionBlocks.map((block) => `${block.sortOrder}:${block.type}`)).toEqual([
      '-1:hero_banner',
      '0:color_card_list',
      '1:image_card_grid',
      '99:promotion_banner',
    ]);
  });
});
