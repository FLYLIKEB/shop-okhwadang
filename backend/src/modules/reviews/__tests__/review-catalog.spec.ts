import {
  buildReviewCatalog,
  compareCatalogTieBreakers,
  reviewCatalogSource,
  isInternalReviewSource,
} from '../review-catalog';

describe('review-catalog', () => {
  it('merges mapped source strategies before deterministic sorting and pagination', () => {
    const page = buildReviewCatalog(
      [
        reviewCatalogSource(
          [{ id: 1, source: 'internal', rating: 4, reviewedAt: new Date('2026-01-01') }],
          (item) => ({ ...item, label: 'okhwadang' }),
        ),
        reviewCatalogSource(
          [
            { id: 2, source: 'smartstore', rating: 5, reviewedAt: new Date('2026-01-03') },
            { id: 3, source: 'smartstore', rating: 3, reviewedAt: new Date('2026-01-02') },
          ],
          (item) => ({ ...item, label: 'external' }),
        ),
      ],
      (a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime() || compareCatalogTieBreakers(a, b),
      2,
      1,
    );

    expect(page).toMatchObject({ total: 3, page: 2, limit: 1 });
    expect(page.items).toEqual([
      {
        id: 3,
        source: 'smartstore',
        rating: 3,
        reviewedAt: new Date('2026-01-02'),
        label: 'external',
      },
    ]);
  });

  it('keeps admin source target selection centralized', () => {
    expect(isInternalReviewSource('internal')).toBe(true);
    expect(isInternalReviewSource('okhwadang')).toBe(true);
    expect(isInternalReviewSource('smartstore')).toBe(false);
    expect(isInternalReviewSource(undefined)).toBe(false);
  });
});
