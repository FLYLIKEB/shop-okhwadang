import { banners, promotions } from './seed-data';

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
