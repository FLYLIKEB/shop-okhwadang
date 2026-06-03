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
      '0:archive_nilo',
      '1:archive_process',
      '2:archive_artist',
      '99:promotion_banner',
    ]);
  });

  it('seeds collection body blocks between CMS-managed hero and CTA blocks', () => {
    const collectionBlocks = pageBlocks
      .filter((block) => block.pageSlug === 'collection')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    expect(collectionBlocks.map((block) => `${block.sortOrder}:${block.type}`)).toEqual([
      '-1:hero_banner',
      '0:collection_clay',
      '1:collection_shape',
      '99:promotion_banner',
    ]);
  });
});
