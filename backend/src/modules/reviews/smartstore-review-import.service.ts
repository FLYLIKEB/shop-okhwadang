import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { In, Repository } from 'typeorm';
import {
  assertXlsxFile,
  cellToString,
  normalizeExcelHeader,
  splitExcelList,
} from '../../common/imports/excel-import.util';
import {
  buildNaverExternalProductKey,
  LEGACY_SMARTSTORE_REVIEW_SOURCE,
  NAVER_SMARTSTORE_REVIEW_SOURCE,
} from '../../common/imports/external-source.util';
import { Product } from '../products/entities/product.entity';
import { RemoteImageIngestService } from '../upload/remote-image-ingest.service';
import { RemoteImageIngestCache } from '../upload/remote-image-ingest.cache';
import { ExternalReview, ExternalReviewMediaAsset } from './entities/external-review.entity';
import { ReviewStatsSyncService } from './review-stats-sync.service';

export type SmartStoreReviewImportAction = 'create' | 'update' | 'skip';
export type SmartStoreReviewImportStatus = 'valid' | 'failed' | 'success';

export interface SmartStoreReviewImportRowResult {
  rowNumber: number;
  externalReviewId: string | null;
  externalProductId: string | null;
  externalProductKey: string | null;
  productName: string | null;
  matchedProductId?: number;
  action: SmartStoreReviewImportAction;
  status: SmartStoreReviewImportStatus;
  rating: number | null;
  reviewType: string | null;
  reviewedAt: string | null;
  mediaCount: number;
  mediaSuccessCount: number;
  mediaFailureCount: number;
  isVisible: boolean | null;
  errors: string[];
  warnings: string[];
}

export interface SmartStoreReviewImportResult {
  importBatchId: string | null;
  summary: {
    totalRows: number;
    createCount: number;
    updateCount: number;
    skipCount: number;
    successCount: number;
    failureCount: number;
    unmatchedProductCount: number;
    mediaFailureCount: number;
  };
  rows: SmartStoreReviewImportRowResult[];
}

interface ParsedReviewRow {
  rowNumber: number;
  externalReviewId: string | null;
  externalProductId: string | null;
  externalProductKey: string | null;
  productName: string | null;
  reviewType: string | null;
  rating: number | null;
  mediaUrls: string[];
  content: string | null;
  helpfulCount: number;
  reviewerNameMasked: string | null;
  reviewedAt: Date | null;
  sourceUpdatedAt: Date | null;
  sourceDisplayStatus: string | null;
  isVisible: boolean | null;
  isBest: boolean;
  bestSelectedAt: Date | null;
  relatedReviewExternalId: string | null;
  relatedReviewContent: string | null;
  orderNo: string | null;
  rawData: Record<string, string | null>;
  errors: string[];
}

type HeaderKey =
  | 'externalProductId'
  | 'productName'
  | 'reviewType'
  | 'rating'
  | 'mediaUrls'
  | 'content'
  | 'helpfulCount'
  | 'reviewerNameMasked'
  | 'reviewedAt'
  | 'sourceUpdatedAt'
  | 'externalReviewId'
  | 'relatedReviewExternalId'
  | 'relatedReviewContent'
  | 'sourceDisplayStatus'
  | 'replyEnabled'
  | 'replyCreatedAt'
  | 'isBest'
  | 'bestSelectedAt'
  | 'benefit'
  | 'benefitGivenAt'
  | 'orderNo';

type HeaderMap = Partial<Record<HeaderKey, number>>;

const HEADER_ALIASES: Record<HeaderKey, readonly string[]> = {
  externalProductId: ['상품번호', '스마트스토어 상품번호', '네이버상품번호'],
  productName: ['상품명', '상품 이름', '제품명'],
  reviewType: ['리뷰구분', '리뷰 구분'],
  rating: ['구매자평점', '평점', '별점'],
  mediaUrls: ['포토/영상', '포토영상', '사진/동영상', '이미지 URL'],
  content: ['리뷰상세내용', '리뷰 상세내용', '리뷰내용', '내용'],
  helpfulCount: ['리뷰도움수', '도움수'],
  reviewerNameMasked: ['등록자', '작성자', '구매자'],
  reviewedAt: ['리뷰등록일', '리뷰 등록일', '작성일'],
  sourceUpdatedAt: ['최종수정일', '최종 수정일', '수정일'],
  externalReviewId: ['리뷰글번호', '리뷰 글번호', '리뷰번호'],
  relatedReviewExternalId: ['관련리뷰글번호', '관련 리뷰글번호'],
  relatedReviewContent: ['관련리뷰상세내용', '관련 리뷰상세내용'],
  sourceDisplayStatus: ['전시상태', '전시 상태'],
  replyEnabled: ['답글여부', '답글 여부'],
  replyCreatedAt: ['답글등록일시', '답글 등록일시'],
  isBest: ['베스트리뷰', '베스트 리뷰'],
  bestSelectedAt: ['베스트리뷰선정일시', '베스트 리뷰 선정일시'],
  benefit: ['혜택지급', '혜택 지급'],
  benefitGivenAt: ['혜택지급일시', '혜택 지급일시'],
  orderNo: ['상품주문번호', '상품 주문번호'],
};

const MAX_IMPORT_ROWS = 2000;
const DEFAULT_REVIEWER_NAME = '스마트스토어 구매자';

@Injectable()
export class SmartStoreReviewImportService {
  private readonly logger = new Logger(SmartStoreReviewImportService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ExternalReview)
    private readonly externalReviewRepository: Repository<ExternalReview>,
    private readonly remoteImageIngestService: RemoteImageIngestService,
    private readonly reviewStatsSyncService: ReviewStatsSyncService,
  ) {}

  async preview(file: Express.Multer.File): Promise<SmartStoreReviewImportResult> {
    return this.process(file, false);
  }

  async commit(file: Express.Multer.File): Promise<SmartStoreReviewImportResult> {
    return this.process(file, true);
  }

  private async process(
    file: Express.Multer.File,
    commit: boolean,
  ): Promise<SmartStoreReviewImportResult> {
    assertXlsxFile(file, '스마트스토어 리뷰');
    const parsedRows = await this.parseWorkbook(file.buffer);
    const duplicates = this.findDuplicates(
      parsedRows.map((row) => row.externalReviewId).filter((id): id is string => Boolean(id)),
    );
    const productsBySku = await this.findProductsByExternalKey(parsedRows);
    const existingByReviewId = await this.findExistingReviews(parsedRows);
    const importBatchId = commit ? this.createImportBatchId() : null;
    const mediaCache = new RemoteImageIngestCache(this.remoteImageIngestService);
    const rows: SmartStoreReviewImportRowResult[] = [];
    const touchedProductIds = new Set<number>();

    for (const parsed of parsedRows) {
      const errors = [...parsed.errors];
      if (parsed.externalReviewId && duplicates.has(parsed.externalReviewId)) {
        errors.push(`파일 안에서 중복된 리뷰글번호입니다: ${parsed.externalReviewId}`);
      }

      const matchedProduct = parsed.externalProductKey
        ? productsBySku.get(parsed.externalProductKey)
        : undefined;
      if (!matchedProduct) {
        errors.push(
          `상품번호와 연결된 상품을 찾을 수 없습니다: ${parsed.externalProductKey ?? '-'}`,
        );
      }

      const existing = parsed.externalReviewId
        ? existingByReviewId.get(parsed.externalReviewId)
        : undefined;
      const action: SmartStoreReviewImportAction =
        errors.length > 0 ? 'skip' : existing ? 'update' : 'create';
      const rowResult = this.toRowResult(parsed, matchedProduct?.id, action, errors);

      if (commit && errors.length === 0 && matchedProduct && parsed.externalReviewId) {
        await this.commitRow({
          parsed,
          existing,
          productId: matchedProduct.id,
          importBatchId: importBatchId!,
          mediaCache,
          rowResult,
        });
        touchedProductIds.add(Number(matchedProduct.id));
      }

      rows.push(rowResult);
    }

    if (commit && touchedProductIds.size > 0) {
      await Promise.all(
        [...touchedProductIds].map((productId) =>
          this.reviewStatsSyncService.syncProductStats(productId, this.productRepository.manager),
        ),
      );
    }

    const result = this.buildResult(importBatchId, rows);
    if (commit) {
      this.logger.log(
        `SmartStore review import committed: batch=${importBatchId}, total=${result.summary.totalRows}, success=${result.summary.successCount}, failure=${result.summary.failureCount}`,
      );
    }
    return result;
  }

  private async parseWorkbook(buffer: Buffer): Promise<ParsedReviewRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('리뷰 엑셀 시트를 찾을 수 없습니다.');
    }

    const headerMap = this.buildHeaderMap(worksheet.getRow(1));
    if (!headerMap.externalProductId || !headerMap.externalReviewId || !headerMap.rating) {
      throw new BadRequestException(
        '필수 컬럼을 찾을 수 없습니다: 상품번호, 리뷰글번호, 구매자평점.',
      );
    }

    const dataRowCount = Math.max(0, worksheet.rowCount - 1);
    if (dataRowCount > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `한 번에 최대 ${MAX_IMPORT_ROWS}개 리뷰까지만 업로드할 수 있습니다.`,
      );
    }

    const rows: ParsedReviewRow[] = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      if (!row.hasValues) continue;
      const parsed = this.parseRow(row, rowNumber, headerMap);
      if (
        parsed.externalReviewId ||
        parsed.externalProductId ||
        parsed.content ||
        parsed.errors.length > 0
      ) {
        rows.push(parsed);
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException('가져올 리뷰 행이 없습니다.');
    }
    return rows;
  }

  private buildHeaderMap(row: ExcelJS.Row): HeaderMap {
    const headerMap: HeaderMap = {};
    row.eachCell((cell, colNumber) => {
      const normalized = normalizeExcelHeader(cellToString(cell.value));
      if (!normalized) return;
      for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<
        [HeaderKey, readonly string[]]
      >) {
        if (headerMap[key]) continue;
        if (aliases.some((alias) => normalizeExcelHeader(alias) === normalized)) {
          headerMap[key] = colNumber;
        }
      }
    });
    return headerMap;
  }

  private parseRow(row: ExcelJS.Row, rowNumber: number, headerMap: HeaderMap): ParsedReviewRow {
    const externalProductId = this.getCell(row, headerMap.externalProductId);
    const externalReviewId = this.getCell(row, headerMap.externalReviewId);
    const rating = this.parseInteger(this.getCell(row, headerMap.rating));
    const reviewedAt = this.parseSmartStoreDate(this.getCell(row, headerMap.reviewedAt));
    const sourceUpdatedAt = this.parseSmartStoreDate(this.getCell(row, headerMap.sourceUpdatedAt));
    const sourceDisplayStatus = this.getCell(row, headerMap.sourceDisplayStatus) || null;
    const bestValue = this.getCell(row, headerMap.isBest);
    const rawData = this.buildRawData(row, headerMap);
    const errors: string[] = [];

    if (!externalProductId) errors.push('상품번호가 필요합니다.');
    if (!externalReviewId) errors.push('리뷰글번호가 필요합니다.');
    if (rating === null || rating < 1 || rating > 5)
      errors.push('구매자평점은 1~5 사이여야 합니다.');
    if (!reviewedAt) errors.push('리뷰등록일을 해석할 수 없습니다.');

    return {
      rowNumber,
      externalReviewId: externalReviewId || null,
      externalProductId: externalProductId || null,
      externalProductKey: buildNaverExternalProductKey(externalProductId),
      productName: this.getCell(row, headerMap.productName) || null,
      reviewType: this.getCell(row, headerMap.reviewType) || null,
      rating,
      mediaUrls: this.collectValidMediaUrls(this.getCell(row, headerMap.mediaUrls), errors),
      content: decodeHtmlEntities(this.getCell(row, headerMap.content)) || null,
      helpfulCount: this.parseInteger(this.getCell(row, headerMap.helpfulCount)) ?? 0,
      reviewerNameMasked: this.getCell(row, headerMap.reviewerNameMasked) || null,
      reviewedAt,
      sourceUpdatedAt,
      sourceDisplayStatus,
      isVisible: sourceDisplayStatus ? this.isSourceVisible(sourceDisplayStatus) : true,
      isBest: this.parseBooleanFlag(bestValue),
      bestSelectedAt: this.parseSmartStoreDate(this.getCell(row, headerMap.bestSelectedAt)),
      relatedReviewExternalId: this.getCell(row, headerMap.relatedReviewExternalId) || null,
      relatedReviewContent:
        decodeHtmlEntities(this.getCell(row, headerMap.relatedReviewContent)) || null,
      orderNo: this.getCell(row, headerMap.orderNo) || null,
      rawData,
      errors,
    };
  }

  private async findProductsByExternalKey(rows: ParsedReviewRow[]): Promise<Map<string, Product>> {
    const keys = rows
      .map((row) => row.externalProductKey)
      .filter((key): key is string => Boolean(key));
    const unique = [...new Set(keys)];
    if (unique.length === 0) return new Map();
    const products = await this.productRepository.find({ where: { sku: In(unique) } });
    return new Map(
      products.filter((product) => product.sku).map((product) => [product.sku as string, product]),
    );
  }

  private async findExistingReviews(rows: ParsedReviewRow[]): Promise<Map<string, ExternalReview>> {
    const ids = rows.map((row) => row.externalReviewId).filter((id): id is string => Boolean(id));
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const reviews = await this.externalReviewRepository.find({
      where: {
        source: In([NAVER_SMARTSTORE_REVIEW_SOURCE, LEGACY_SMARTSTORE_REVIEW_SOURCE]),
        externalReviewId: In(unique),
      },
    });
    return new Map(reviews.map((review) => [review.externalReviewId, review]));
  }

  private toRowResult(
    parsed: ParsedReviewRow,
    matchedProductId: number | undefined,
    action: SmartStoreReviewImportAction,
    errors: string[],
  ): SmartStoreReviewImportRowResult {
    return {
      rowNumber: parsed.rowNumber,
      externalReviewId: parsed.externalReviewId,
      externalProductId: parsed.externalProductId,
      externalProductKey: parsed.externalProductKey,
      productName: parsed.productName,
      matchedProductId,
      action,
      status: errors.length > 0 ? 'failed' : 'valid',
      rating: parsed.rating,
      reviewType: parsed.reviewType,
      reviewedAt: parsed.reviewedAt?.toISOString() ?? null,
      mediaCount: parsed.mediaUrls.length,
      mediaSuccessCount: 0,
      mediaFailureCount: 0,
      isVisible: parsed.isVisible,
      errors,
      warnings: [],
    };
  }

  private async commitRow(args: {
    parsed: ParsedReviewRow;
    existing: ExternalReview | undefined;
    productId: number;
    importBatchId: string;
    mediaCache: RemoteImageIngestCache;
    rowResult: SmartStoreReviewImportRowResult;
  }): Promise<void> {
    const { parsed, existing, productId, importBatchId, mediaCache, rowResult } = args;
    const mediaAssets = await this.resolveMediaAssets(parsed.mediaUrls, mediaCache, rowResult);
    const imageUrls = mediaAssets
      .filter((asset) => asset.status === 'uploaded' && asset.s3Url)
      .map((asset) => asset.s3Url as string);

    const now = new Date();
    const patch: Partial<ExternalReview> = {
      productId,
      source: NAVER_SMARTSTORE_REVIEW_SOURCE,
      externalReviewId: parsed.externalReviewId!,
      externalProductId: parsed.externalProductId,
      reviewType: parsed.reviewType,
      rating: parsed.rating!,
      content: parsed.content,
      imageUrls: imageUrls.length > 0 ? imageUrls : null,
      mediaAssets: mediaAssets.length > 0 ? mediaAssets : null,
      reviewerNameMasked: parsed.reviewerNameMasked?.trim() || DEFAULT_REVIEWER_NAME,
      helpfulCount: parsed.helpfulCount,
      sourceDisplayStatus: parsed.sourceDisplayStatus,
      isVisible: existing ? existing.isVisible : (parsed.isVisible ?? true),
      isBest: parsed.isBest,
      bestSelectedAt: parsed.bestSelectedAt,
      relatedReviewExternalId: parsed.relatedReviewExternalId,
      relatedReviewContent: parsed.relatedReviewContent,
      orderNo: parsed.orderNo,
      rawData: parsed.rawData,
      importBatchId,
      reviewedAt: parsed.reviewedAt!,
      sourceUpdatedAt: parsed.sourceUpdatedAt,
      lastSyncedAt: now,
    };

    try {
      const entity = existing
        ? this.externalReviewRepository.create({ ...existing, ...patch })
        : this.externalReviewRepository.create(patch);
      const saved = await this.externalReviewRepository.save(entity);
      rowResult.matchedProductId = Number(saved.productId);
      rowResult.status = 'success';
    } catch (err) {
      rowResult.status = 'failed';
      rowResult.action = 'skip';
      rowResult.errors.push(err instanceof Error ? err.message : '리뷰 저장에 실패했습니다.');
    }
  }

  private async resolveMediaAssets(
    urls: string[],
    cache: RemoteImageIngestCache,
    rowResult: SmartStoreReviewImportRowResult,
  ): Promise<ExternalReviewMediaAsset[]> {
    const mediaAssets: ExternalReviewMediaAsset[] = [];
    for (const url of urls) {
      try {
        const uploaded = await cache.ingest(url);
        rowResult.mediaSuccessCount += 1;
        mediaAssets.push({
          type: this.guessMediaType(url),
          originalUrl: url,
          s3Url: uploaded.url,
          s3Key: uploaded.filename,
          status: 'uploaded',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.';
        rowResult.mediaFailureCount += 1;
        rowResult.warnings.push(message);
        mediaAssets.push({
          type: this.guessMediaType(url),
          originalUrl: url,
          s3Url: null,
          s3Key: null,
          status: 'failed',
          error: message,
        });
      }
    }
    return mediaAssets;
  }


  private buildResult(
    importBatchId: string | null,
    rows: SmartStoreReviewImportRowResult[],
  ): SmartStoreReviewImportResult {
    const summary = rows.reduce(
      (acc, row) => {
        acc.totalRows += 1;
        if (row.action === 'create') acc.createCount += 1;
        if (row.action === 'update') acc.updateCount += 1;
        if (row.action === 'skip') acc.skipCount += 1;
        if (row.status === 'success') acc.successCount += 1;
        if (row.status === 'failed') acc.failureCount += 1;
        if (row.errors.some((error) => error.includes('연결된 상품을 찾을 수 없습니다'))) {
          acc.unmatchedProductCount += 1;
        }
        acc.mediaFailureCount += row.mediaFailureCount;
        return acc;
      },
      {
        totalRows: 0,
        createCount: 0,
        updateCount: 0,
        skipCount: 0,
        successCount: 0,
        failureCount: 0,
        unmatchedProductCount: 0,
        mediaFailureCount: 0,
      },
    );
    return { importBatchId, summary, rows };
  }

  private getCell(row: ExcelJS.Row, columnNumber: number | undefined): string {
    if (!columnNumber) return '';
    return cellToString(row.getCell(columnNumber).value).trim();
  }

  private buildRawData(row: ExcelJS.Row, headerMap: HeaderMap): Record<string, string | null> {
    return Object.fromEntries(
      Object.entries(headerMap).map(([key, column]) => [
        key,
        column ? this.getCell(row, column) || null : null,
      ]),
    );
  }

  private parseInteger(value: string): number | null {
    if (!value) return null;
    const normalized = value.replace(/[^0-9.-]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  private parseSmartStoreDate(value: string): Date | null {
    if (!value) return null;
    const trimmed = value.trim();
    const match = trimmed.match(
      /^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/,
    );
    if (match) {
      const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
      const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}+09:00`;
      const date = new Date(normalized);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const iso = new Date(trimmed);
    return Number.isNaN(iso.getTime()) ? null : iso;
  }

  private collectValidMediaUrls(value: string, errors: string[]): string[] {
    const unique = [...new Set(splitExcelList(value))];
    const urls: string[] = [];
    for (const url of unique) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('unsupported protocol');
        }
        urls.push(url);
      } catch {
        errors.push(`포토/영상 URL 형식이 올바르지 않습니다: ${url}`);
      }
    }
    return urls;
  }

  private isSourceVisible(value: string): boolean {
    const normalized = value.replace(/\s/g, '').toLowerCase();
    if (!normalized) return true;
    return !(
      normalized.includes('숨김') ||
      normalized.includes('미전시') ||
      normalized.includes('비전시') ||
      normalized.includes('삭제') ||
      normalized.includes('hidden')
    );
  }

  private parseBooleanFlag(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === 'y' || normalized === 'yes' || normalized === 'true' || normalized === '1'
    );
  }

  private guessMediaType(url: string): ExternalReviewMediaAsset['type'] {
    const pathname = new URL(url).pathname.toLowerCase();
    if (/\.(jpe?g|png|webp|gif|bmp)$/.test(pathname)) return 'image';
    if (/\.(mp4|mov|webm)$/.test(pathname)) return 'video';
    return 'unknown';
  }

  private findDuplicates(values: string[]): Set<string> {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) duplicates.add(value);
      seen.add(value);
    }
    return duplicates;
  }

  private createImportBatchId(): string {
    return `naver-review-${new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function decodeHtmlEntities(value: string): string {
  if (!value) return '';
  const named: Record<string, string> = {
    quot: '"',
    amp: '&',
    lt: '<',
    gt: '>',
    apos: "'",
    nbsp: ' ',
    hellip: '…',
  };
  return value.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, code: string) => {
    if (code.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }
    return named[code] ?? entity;
  });
}
