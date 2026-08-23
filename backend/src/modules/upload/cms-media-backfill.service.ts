import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CMS_MEDIA_VARIANTS, CmsMediaKind } from './cms-media.constants';
import { RemoteImageIngestService } from './remote-image-ingest.service';
import type { CmsMedia } from './upload.service';

export interface CmsMediaBackfillOptions {
  dryRun?: boolean;
  limit?: number;
}

export interface CmsMediaBackfillResult {
  scanned: number;
  converted: number;
  skipped: number;
  failed: number;
  failures: Array<{ target: string; reason: string }>;
}

export interface ConversionTarget {
  key: string;
  kind: CmsMediaKind;
  url: string | null;
  derivatives: Record<string, string> | null;
  applyDerivatives(derivatives: Record<string, string>): void;
}

const CMS_BLOCK_KINDS: Record<string, CmsMediaKind> = {
  hero_banner: 'hero',
  promotion_banner: 'promotion',
};

@Injectable()
export class CmsMediaBackfillService {
  private readonly logger = new Logger(CmsMediaBackfillService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly remoteImageIngestService: RemoteImageIngestService,
  ) {}

  async backfill(options: CmsMediaBackfillOptions = {}): Promise<CmsMediaBackfillResult> {
    const result: CmsMediaBackfillResult = {
      scanned: 0,
      converted: 0,
      skipped: 0,
      failed: 0,
      failures: [],
    };
    const mediaCache = new Map<string, Promise<CmsMedia>>();

    for (const block of await this.loadPageBlocks()) {
      if (this.limitReached(result, options.limit)) break;
      await this.processPageBlock(block, result, options, mediaCache);
    }

    for (const row of await this.loadSimpleRows('banners', 'image_url', 'image_derivatives')) {
      if (this.limitReached(result, options.limit)) break;
      await this.processSimpleRow('banners', row, 'image_derivatives', 'hero', result, options, mediaCache);
    }

    for (const row of await this.loadSimpleRows('promotions', 'image_url', 'image_derivatives')) {
      if (this.limitReached(result, options.limit)) break;
      await this.processSimpleRow('promotions', row, 'image_derivatives', 'promotion', result, options, mediaCache);
    }

    for (const row of await this.loadSimpleRows('journal_entries', 'cover_image_url', 'cover_image_derivatives')) {
      if (this.limitReached(result, options.limit)) break;
      await this.processSimpleRow('journal_entries', row, 'cover_image_derivatives', 'journal', result, options, mediaCache);
    }

    this.logger.log(
      `CMS media derivative backfill complete: scanned=${result.scanned}, converted=${result.converted}, skipped=${result.skipped}, failed=${result.failed}, dryRun=${options.dryRun === true}`,
    );
    return result;
  }

  private async processPageBlock(
    row: { id: number; type: string; content: unknown; updated_at: unknown },
    result: CmsMediaBackfillResult,
    options: CmsMediaBackfillOptions,
    mediaCache: Map<string, Promise<CmsMedia>>,
  ): Promise<void> {
    const content = normalizeRecord(row.content);
    const targets = collectPageBlockTargets(row.id, row.type, content);
    if (targets.length === 0) return;

    let changed = false;
    for (const target of targets) {
      const converted = await this.processTarget(target, result, options, mediaCache);
      changed = changed || converted;
    }

    if (changed && options.dryRun !== true) {
      const updateResult = await this.dataSource.query(
        'UPDATE `page_blocks` SET `content` = ? WHERE `id` = ? AND `updated_at` = ?',
        [
          JSON.stringify(content),
          row.id,
          row.updated_at,
        ],
      );
      if (isZeroAffectedUpdate(updateResult)) {
        result.failed += 1;
        result.failures.push({
          target: `page_blocks:${row.id}`,
          reason: 'concurrent update detected; derivatives were not written and should be retried',
        });
      }
    }
  }

  private async processSimpleRow(
    table: string,
    row: { id: number; image_url: string | null; image_derivatives: unknown },
    derivativesColumn: string,
    kind: CmsMediaKind,
    result: CmsMediaBackfillResult,
    options: CmsMediaBackfillOptions,
    mediaCache: Map<string, Promise<CmsMedia>>,
  ): Promise<void> {
    const target: ConversionTarget = {
      key: `${table}:${row.id}`,
      kind,
      url: row.image_url,
      derivatives: normalizeDerivativeRecord(row.image_derivatives),
      applyDerivatives: (derivatives) => {
        row.image_derivatives = derivatives;
      },
    };

    const converted = await this.processTarget(target, result, options, mediaCache);
    if (converted && options.dryRun !== true) {
      await this.dataSource.query(`UPDATE \`${table}\` SET \`${derivativesColumn}\` = ? WHERE \`id\` = ?`, [
        JSON.stringify(row.image_derivatives),
        row.id,
      ]);
    }
  }

  private async processTarget(
    target: ConversionTarget,
    result: CmsMediaBackfillResult,
    options: CmsMediaBackfillOptions,
    mediaCache: Map<string, Promise<CmsMedia>>,
  ): Promise<boolean> {
    result.scanned += 1;

    if (!target.url || hasRequiredDerivatives(target.kind, target.derivatives)) {
      result.skipped += 1;
      return false;
    }

    if (options.dryRun === true) {
      result.converted += 1;
      return false;
    }

    try {
      const media = await this.ingestCached(target.url, target.kind, mediaCache);
      target.applyDerivatives(toDerivativeUrls(media));
      result.converted += 1;
      return true;
    } catch (err) {
      result.failed += 1;
      result.failures.push({ target: target.key, reason: errorMessage(err) });
      return false;
    }
  }

  private ingestCached(
    url: string,
    kind: CmsMediaKind,
    mediaCache: Map<string, Promise<CmsMedia>>,
  ): Promise<CmsMedia> {
    const key = `${kind}:${url.trim()}`;
    const cached = mediaCache.get(key);
    if (cached) return cached;

    const promise = this.remoteImageIngestService.ingestCms(url, kind).catch((err: unknown) => {
      if (mediaCache.get(key) === promise) mediaCache.delete(key);
      throw err;
    });
    mediaCache.set(key, promise);
    return promise;
  }

  private async loadPageBlocks(): Promise<Array<{ id: number; type: string; content: unknown; updated_at: unknown }>> {
    return this.dataSource.query(
      'SELECT `id`, `type`, `content`, `updated_at` FROM `page_blocks` WHERE `type` IN (?, ?)',
      ['hero_banner', 'promotion_banner'],
    ) as Promise<Array<{ id: number; type: string; content: unknown; updated_at: unknown }>>;
  }

  private async loadSimpleRows(
    table: string,
    imageColumn: string,
    derivativesColumn: string,
  ): Promise<Array<{ id: number; image_url: string | null; image_derivatives: unknown }>> {
    return this.dataSource.query(
      `SELECT \`id\`, \`${imageColumn}\` AS image_url, \`${derivativesColumn}\` AS image_derivatives FROM \`${table}\``,
    ) as Promise<Array<{ id: number; image_url: string | null; image_derivatives: unknown }>>;
  }

  private limitReached(result: CmsMediaBackfillResult, limit?: number): boolean {
    return typeof limit === 'number' && limit >= 0 && result.scanned >= limit;
  }
}

export function collectPageBlockTargets(
  blockId: number,
  type: string,
  content: Record<string, unknown>,
): ConversionTarget[] {
  const kind = CMS_BLOCK_KINDS[type];
  if (!kind) return [];

  if (kind === 'hero') {
    const targets: ConversionTarget[] = [];
    targets.push(createContentTarget(`page_blocks:${blockId}:image_url`, kind, content));

    const slides = content.slides;
    if (Array.isArray(slides)) {
      slides.forEach((slide, index) => {
        if (isRecord(slide)) {
          targets.push(createContentTarget(`page_blocks:${blockId}:slides:${index}`, kind, slide));
        }
      });
    }
    return targets;
  }

  return [createContentTarget(`page_blocks:${blockId}:image_url`, kind, content)];
}

function createContentTarget(
  key: string,
  kind: CmsMediaKind,
  content: Record<string, unknown>,
): ConversionTarget {
  return {
    key,
    kind,
    url: typeof content.image_url === 'string' ? content.image_url : null,
    derivatives: normalizeDerivativeRecord(content.image_derivatives),
    applyDerivatives: (derivatives) => {
      content.image_derivatives = derivatives;
    },
  };
}

export function hasRequiredDerivatives(
  kind: CmsMediaKind,
  derivatives: Record<string, string> | null,
): boolean {
  return derivatives !== null && CMS_MEDIA_VARIANTS[kind].every((variant) => typeof derivatives[variant] === 'string' && derivatives[variant].length > 0);
}

export function toDerivativeUrls(media: CmsMedia): Record<string, string> {
  return Object.fromEntries(
    Object.entries(media.derivatives).map(([variant, uploaded]) => [variant, uploaded.url]),
  );
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(value) ? value : {};
}

function normalizeDerivativeRecord(value: unknown): Record<string, string> | null {
  const record = normalizeRecord(value);
  const entries = Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isZeroAffectedUpdate(value: unknown): boolean {
  if (typeof value === 'number') return value === 0;
  return isRecord(value) && (value.affectedRows === 0 || value.affected === 0);
}
