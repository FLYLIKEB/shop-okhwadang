import { CmsMediaBackfillService, collectPageBlockTargets, hasRequiredDerivatives } from '../cms-media-backfill.service';
import { RemoteImageIngestService } from '../remote-image-ingest.service';
import { DataSource } from 'typeorm';

describe('CMS media derivative backfill', () => {
  it('requires all usage-specific variants before skipping conversion', () => {
    expect(hasRequiredDerivatives('hero', { desktop: '/hero-desktop.webp' })).toBe(false);
    expect(hasRequiredDerivatives('hero', { desktop: '/hero-desktop.webp', mobile: '/hero-mobile.webp' })).toBe(true);
    expect(hasRequiredDerivatives('journal', { thumbnail: '/journal-thumb.webp' })).toBe(true);
  });

  it('collects hero top-level and slide image targets from page block content', () => {
    const content = {
      image_url: 'https://cdn.example.com/root.jpg',
      slides: [
        { image_url: 'https://cdn.example.com/slide-1.jpg' },
        { title: 'text-only' },
      ],
    };

    const targets = collectPageBlockTargets(7, 'hero_banner', content);

    expect(targets.map((target) => target.key)).toEqual([
      'page_blocks:7:image_url',
      'page_blocks:7:slides:0',
      'page_blocks:7:slides:1',
    ]);
  });

  it('updates missing page-block and journal derivatives while preserving originals', async () => {
    const executed: Array<{ sql: string; params?: unknown[] }> = [];
    const query = jest.fn(async (sql: string, params?: unknown[]) => {
      executed.push({ sql, params });
      if (sql.includes('FROM `page_blocks`')) {
        return [
          {
            id: 1,
            type: 'hero_banner',
            content: {
              image_url: 'https://cdn.example.com/hero.jpg',
              slides: [{ image_url: 'https://cdn.example.com/slide.jpg' }],
            },
          },
        ];
      }
      if (sql.includes('FROM `banners`') || sql.includes('FROM `promotions`')) return [];
      if (sql.includes('FROM `journal_entries`')) {
        return [
          {
            id: 4,
            image_url: 'https://cdn.example.com/journal.jpg',
            image_derivatives: null,
          },
        ];
      }
      return [];
    });
    const dataSource = { query } as unknown as DataSource;
    const ingestCms = jest.fn(async (url: string, kind: string) => ({
      original: { url, filename: 'original.jpg' },
      derivatives: Object.fromEntries(
        (kind === 'hero' ? ['desktop', 'mobile'] : ['thumbnail']).map((variant) => [
          variant,
          { url: `https://cdn.example.com/${kind}/${variant}.webp`, filename: `${variant}.webp` },
        ]),
      ),
    }));
    const service = new CmsMediaBackfillService(
      dataSource,
      { ingestCms } as unknown as RemoteImageIngestService,
    );

    const result = await service.backfill();

    expect(result).toMatchObject({ scanned: 3, converted: 3, skipped: 0, failed: 0 });
    expect(ingestCms).toHaveBeenCalledWith('https://cdn.example.com/hero.jpg', 'hero');
    expect(ingestCms).toHaveBeenCalledWith('https://cdn.example.com/slide.jpg', 'hero');
    expect(ingestCms).toHaveBeenCalledWith('https://cdn.example.com/journal.jpg', 'journal');

    const pageUpdate = executed.find((entry) => entry.sql.startsWith('UPDATE `page_blocks`'));
    expect(pageUpdate?.params?.[0]).toContain('image_derivatives');
    expect(pageUpdate?.params?.[0]).toContain('/hero/desktop.webp');

    const journalUpdate = executed.find((entry) => entry.sql.startsWith('UPDATE `journal_entries`'));
    expect(journalUpdate?.params).toEqual([
      JSON.stringify({ thumbnail: 'https://cdn.example.com/journal/thumbnail.webp' }),
      4,
    ]);
  });

  it('dry-run reports candidates without downloading or writing derivatives', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM `page_blocks`')) {
        return [{ id: 2, type: 'promotion_banner', content: { image_url: 'https://cdn.example.com/promo.jpg' } }];
      }
      return [];
    });
    const ingestCms = jest.fn();
    const service = new CmsMediaBackfillService(
      { query } as unknown as DataSource,
      { ingestCms } as unknown as RemoteImageIngestService,
    );

    const result = await service.backfill({ dryRun: true });

    expect(result).toMatchObject({ scanned: 1, converted: 1, skipped: 0, failed: 0 });
    expect(ingestCms).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalledWith(expect.stringMatching(/^UPDATE/), expect.anything());
  });

  it('reports a concurrent page-block update without overwriting the newer document', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM `page_blocks`')) {
        return [{
          id: 8,
          type: 'promotion_banner',
          updated_at: '2026-08-23 10:00:00',
          content: { image_url: 'https://cdn.example.com/promo.jpg' },
        }];
      }
      if (sql.startsWith('UPDATE `page_blocks`')) return { affectedRows: 0 };
      return [];
    });
    const ingestCms = jest.fn(async () => ({
      original: { url: 'https://cdn.example.com/promo.jpg', filename: 'original.jpg' },
      derivatives: {
        desktop: { url: 'https://cdn.example.com/promo/desktop.webp', filename: 'desktop.webp' },
        mobile: { url: 'https://cdn.example.com/promo/mobile.webp', filename: 'mobile.webp' },
      },
    }));
    const service = new CmsMediaBackfillService(
      { query } as unknown as DataSource,
      { ingestCms } as unknown as RemoteImageIngestService,
    );

    const result = await service.backfill();

    expect(result).toMatchObject({ scanned: 1, converted: 1, failed: 1 });
    expect(result.failures).toEqual([{
      target: 'page_blocks:8',
      reason: 'concurrent update detected; derivatives were not written and should be retried',
    }]);
    expect(query).toHaveBeenCalledWith(
      'UPDATE `page_blocks` SET `content` = ? WHERE `id` = ? AND `updated_at` = ?',
      [expect.any(String), 8, '2026-08-23 10:00:00'],
    );
  });
});
