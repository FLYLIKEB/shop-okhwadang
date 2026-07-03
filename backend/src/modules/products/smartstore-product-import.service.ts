import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { In, Repository } from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity';
import { ProductCommandService } from './product-command.service';
import { CreateProductDto, ProductOptionInputDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RemoteImageIngestService } from '../upload/remote-image-ingest.service';
import { UploadedFile } from '../upload/interfaces/storage.interface';

export type SmartStoreImportAction = 'create' | 'update' | 'skip';

export interface SmartStoreImportRowResult {
  rowNumber: number;
  identifier: string | null;
  productName: string | null;
  action: SmartStoreImportAction;
  status: 'valid' | 'failed' | 'success';
  productId?: number;
  optionCount: number;
  galleryImageCount: number;
  detailImageCount: number;
  errors: string[];
}

export interface SmartStoreImportResult {
  summary: {
    totalRows: number;
    createCount: number;
    updateCount: number;
    skipCount: number;
    successCount: number;
    failureCount: number;
  };
  rows: SmartStoreImportRowResult[];
}

interface ParsedSmartStoreRow {
  rowNumber: number;
  identifier: string | null;
  productName: string | null;
  dto: CreateProductDto | null;
  optionCount: number;
  galleryImageCount: number;
  detailImageCount: number;
  errors: string[];
}

const MAX_IMPORT_ROWS = 500;

type SmartStoreImportFormat = 'smartstore-list-export' | 'smartstore-bulk-edit';

interface SmartStoreWorkbookFormat {
  kind: SmartStoreImportFormat;
  worksheet: ExcelJS.Worksheet;
  headerRowNumber: number;
  dataStartRowNumber: number;
}

const HEADER_ALIASES = {
  productNumber: ['상품번호', '상품번호(스마트스토어)', '스마트스토어 상품번호', '네이버상품번호', '상품 ID', '상품ID'],
  sellerCode: ['판매자 상품코드', '판매자상품코드', '판매자 관리코드', '자체 상품코드', 'SKU', 'sku'],
  name: ['상품명', '상품 이름', '제품명'],
  price: ['판매가', '상품가격', '가격', '정상가'],
  salePrice: ['할인가', '즉시할인가', '할인 판매가'],
  stock: ['재고수량', '재고', '재고량'],
  salesStatus: ['판매상태'],
  displayStatus: ['전시상태'],
  productCondition: ['상품상태'],
  representativeImage: ['대표이미지', '대표 이미지', '대표이미지 URL', '대표 이미지 URL', '이미지 URL'],
  additionalImages: ['추가이미지', '추가 이미지', '추가이미지 URL', '추가 이미지 URL'],
  detailImages: ['상세이미지', '상세 이미지', '상세이미지 URL', '상세 이미지 URL'],
  description: ['상세설명', '상품상세', '상품 상세', '상세페이지', '상세 HTML'],
  shortDescription: ['요약설명', '짧은설명', '간단설명'],
  optionType: ['옵션형태'],
  optionNames: ['옵션명'],
  optionValues: ['옵션값'],
  optionPrices: ['옵션가'],
  optionStocks: ['옵션 재고수량', '옵션재고수량'],
  optionUsables: ['옵션 사용여부', '옵션사용여부'],
} as const;

type HeaderKey = keyof typeof HEADER_ALIASES;

type HeaderMap = Partial<Record<HeaderKey, number>>;

const OPTION_TYPE_NONE = '설정안함';
const OPTION_TYPE_SINGLE = '단독형';
const OPTION_TYPE_COMBINATION = '조합형';

@Injectable()
export class SmartStoreProductImportService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly productCommandService: ProductCommandService,
    private readonly remoteImageIngestService: RemoteImageIngestService,
  ) {}

  async preview(file: Express.Multer.File): Promise<SmartStoreImportResult> {
    return this.process(file, false);
  }

  async commit(file: Express.Multer.File): Promise<SmartStoreImportResult> {
    return this.process(file, true);
  }

  private async process(file: Express.Multer.File, commit: boolean): Promise<SmartStoreImportResult> {
    this.assertExcelFile(file);
    const parsedRows = await this.parseWorkbook(file.buffer);
    const identifiers = parsedRows
      .map((row) => row.identifier)
      .filter((identifier): identifier is string => Boolean(identifier));
    const existingProducts = identifiers.length > 0
      ? await this.productRepository.find({ where: { sku: In(identifiers) } })
      : [];
    const existingBySku = new Map(
      existingProducts
        .filter((product) => product.sku)
        .map((product) => [product.sku as string, product]),
    );

    const duplicateIdentifiers = this.findDuplicates(identifiers);
    const ingestCache = new Map<string, Promise<UploadedFile>>();
    const rows: SmartStoreImportRowResult[] = [];

    for (const parsed of parsedRows) {
      const errors = [...parsed.errors];
      if (parsed.identifier && duplicateIdentifiers.has(parsed.identifier)) {
        errors.push(`파일 안에서 중복된 상품 식별자입니다: ${parsed.identifier}`);
      }

      const existing = parsed.identifier ? existingBySku.get(parsed.identifier) : undefined;
      const action: SmartStoreImportAction = errors.length > 0 ? 'skip' : existing ? 'update' : 'create';
      const rowResult: SmartStoreImportRowResult = {
        rowNumber: parsed.rowNumber,
        identifier: parsed.identifier,
        productName: parsed.productName,
        action,
        status: errors.length > 0 ? 'failed' : commit ? 'success' : 'valid',
        productId: existing?.id,
        optionCount: parsed.optionCount,
        galleryImageCount: parsed.galleryImageCount,
        detailImageCount: parsed.detailImageCount,
        errors,
      };

      if (commit && errors.length === 0 && parsed.dto) {
        try {
          const dto = await this.resolveRemoteImages(parsed.dto, ingestCache);
          const saved = existing
            ? await this.productCommandService.update(existing.id, this.toUpdateDto(dto))
            : await this.productCommandService.create({
                ...dto,
                slug: await this.generateUniqueSlug(dto.slug),
              });
          rowResult.productId = saved.id;
          rowResult.status = 'success';
        } catch (err) {
          rowResult.status = 'failed';
          rowResult.action = 'skip';
          rowResult.errors.push(err instanceof Error ? err.message : '상품 저장에 실패했습니다.');
        }
      }

      rows.push(rowResult);
    }

    return this.buildResult(rows);
  }

  private assertExcelFile(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('업로드할 엑셀 파일을 선택해 주세요.');
    }
    const hasXlsxName = file.originalname.toLowerCase().endsWith('.xlsx');
    const hasXlsxMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ].includes(file.mimetype);
    if (!hasXlsxName || !hasXlsxMime) {
      throw new BadRequestException('스마트스토어 상품 엑셀(.xlsx) 파일만 업로드할 수 있습니다.');
    }
  }

  private async parseWorkbook(buffer: Buffer): Promise<ParsedSmartStoreRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const format = this.detectFormat(workbook);
    const headerMap = this.buildHeaderMap(format.worksheet.getRow(format.headerRowNumber));
    if (!headerMap.name || !headerMap.price) {
      throw new BadRequestException('필수 컬럼을 찾을 수 없습니다: 상품명, 판매가. 지원 포맷은 스마트스토어 상품목록 다운로드형 또는 일괄수정 XLSX형입니다.');
    }

    const rows: ParsedSmartStoreRow[] = [];
    const seenDataRows = format.worksheet.rowCount - format.dataStartRowNumber + 1;
    if (seenDataRows > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`한 번에 최대 ${MAX_IMPORT_ROWS}개 상품까지만 업로드할 수 있습니다.`);
    }

    for (let rowNumber = format.dataStartRowNumber; rowNumber <= format.worksheet.rowCount; rowNumber += 1) {
      const row = format.worksheet.getRow(rowNumber);
      if (!row.hasValues) continue;
      const parsed = this.parseRow(row, rowNumber, headerMap);
      if (parsed.productName || parsed.identifier || parsed.errors.length > 0) {
        rows.push(parsed);
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException('가져올 상품 행이 없습니다.');
    }

    return rows;
  }

  private detectFormat(workbook: ExcelJS.Workbook): SmartStoreWorkbookFormat {
    const bulkEditSheet = workbook.worksheets.find((worksheet) => worksheet.name === '일괄수정');
    if (bulkEditSheet) {
      const headerMap = this.buildHeaderMap(bulkEditSheet.getRow(2));
      if (headerMap.name && headerMap.price) {
        return {
          kind: 'smartstore-bulk-edit',
          worksheet: bulkEditSheet,
          headerRowNumber: 2,
          dataStartRowNumber: 6,
        };
      }
    }

    const listExportSheet = workbook.worksheets[0];
    if (listExportSheet) {
      const headerMap = this.buildHeaderMap(listExportSheet.getRow(1));
      if (headerMap.name && headerMap.price) {
        return {
          kind: 'smartstore-list-export',
          worksheet: listExportSheet,
          headerRowNumber: 1,
          dataStartRowNumber: 2,
        };
      }
    }

    throw new BadRequestException('지원하지 않는 스마트스토어 엑셀 형식입니다. 상품목록 다운로드형 또는 일괄수정 XLSX형 파일을 업로드해 주세요.');
  }

  private buildHeaderMap(row: ExcelJS.Row): HeaderMap {
    const headerMap: HeaderMap = {};
    row.eachCell((cell, colNumber) => {
      const normalized = this.normalizeHeader(this.cellToString(cell.value));
      if (!normalized) return;
      for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<[HeaderKey, readonly string[]]>) {
        if (headerMap[key]) continue;
        if (aliases.some((alias) => this.normalizeHeader(alias) === normalized)) {
          headerMap[key] = colNumber;
        }
      }
    });
    return headerMap;
  }

  private parseRow(row: ExcelJS.Row, rowNumber: number, headerMap: HeaderMap): ParsedSmartStoreRow {
    const productNumber = this.getCell(row, headerMap.productNumber);
    const sellerCode = this.getCell(row, headerMap.sellerCode);
    const productName = this.getCell(row, headerMap.name);
    const identifier = this.buildIdentifier(sellerCode, productNumber);
    const errors: string[] = [];

    if (!identifier) errors.push('상품번호 또는 판매자상품코드가 필요합니다.');
    if (!productName) errors.push('상품명이 필요합니다.');

    const price = this.parseMoney(this.getCell(row, headerMap.price));
    if (price === null || price < 1) errors.push('판매가는 1원 이상이어야 합니다.');

    const stock = this.parseInteger(this.getCell(row, headerMap.stock));
    const salePrice = this.parseMoney(this.getCell(row, headerMap.salePrice));
    const description = this.getCell(row, headerMap.description);

    const options = this.parseOptions(row, headerMap, errors);
    const representativeImage = this.getCell(row, headerMap.representativeImage);
    const additionalImages = this.splitImageUrls(this.getCell(row, headerMap.additionalImages));
    const galleryUrls = this.collectValidImageUrls(
      [representativeImage, ...additionalImages].filter(Boolean),
      errors,
    );
    const detailUrls = this.collectValidImageUrls(
      [
        ...this.splitImageUrls(this.getCell(row, headerMap.detailImages)),
        ...this.extractHtmlImageUrls(description),
      ],
      errors,
    );

    const dto: CreateProductDto | null = errors.length > 0 || !identifier || !productName || price === null
      ? null
      : {
          name: productName,
          slug: this.slugify(identifier),
          price,
          salePrice: salePrice ?? undefined,
          stock: stock ?? 0,
          sku: identifier,
          status: this.mapStatus(
            this.getCell(row, headerMap.salesStatus),
            this.getCell(row, headerMap.displayStatus),
            stock ?? 0,
          ),
          shortDescription: this.getCell(row, headerMap.shortDescription) || undefined,
          description: description || undefined,
          images: this.buildImages(productName, galleryUrls),
          detailImages: detailUrls.length > 0
            ? detailUrls.map((url, index) => ({ url, alt: productName, sortOrder: index }))
            : undefined,
          options,
        };

    return {
      rowNumber,
      identifier,
      productName,
      dto,
      optionCount: options?.length ?? 0,
      galleryImageCount: galleryUrls.length,
      detailImageCount: detailUrls.length,
      errors,
    };
  }

  // 옵션형태가 비어 있거나 '설정안함'이면 기존 옵션을 건드리지 않도록 undefined 를 반환한다.
  private parseOptions(row: ExcelJS.Row, headerMap: HeaderMap, errors: string[]): ProductOptionInputDto[] | undefined {
    const optionType = this.getCell(row, headerMap.optionType).replace(/\s/g, '');
    if (!optionType || optionType === OPTION_TYPE_NONE) return undefined;
    if (optionType !== OPTION_TYPE_SINGLE && optionType !== OPTION_TYPE_COMBINATION) {
      errors.push(`지원하지 않는 옵션형태입니다: ${optionType}`);
      return undefined;
    }

    const names = this.splitByComma(this.getCell(row, headerMap.optionNames));
    if (names.length === 0) {
      errors.push('옵션명이 필요합니다.');
      return undefined;
    }
    const valuesRaw = this.getCell(row, headerMap.optionValues);
    if (!valuesRaw) {
      errors.push('옵션값이 필요합니다.');
      return undefined;
    }

    return optionType === OPTION_TYPE_COMBINATION
      ? this.parseCombinationOptions(row, headerMap, names, valuesRaw, errors)
      : this.parseSingleOptions(row, headerMap, names, valuesRaw, errors);
  }

  private parseCombinationOptions(
    row: ExcelJS.Row,
    headerMap: HeaderMap,
    names: string[],
    valuesRaw: string,
    errors: string[],
  ): ProductOptionInputDto[] {
    const valueLines = this.splitLines(valuesRaw);
    const priceLines = this.splitLinesPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionPrices));
    const stockLines = this.splitLinesPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionStocks));
    const usableLines = this.splitLinesPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionUsables));
    const options: ProductOptionInputDto[] = [];

    valueLines.forEach((line, index) => {
      const parts = this.splitByComma(line);
      if (parts.length !== names.length) {
        errors.push(`옵션값 형식이 옵션명 개수와 일치하지 않습니다: ${line}`);
        return;
      }
      if (!this.isOptionUsable(usableLines[index])) return;
      options.push({
        name: names.join('/'),
        value: parts.join('/'),
        priceAdjustment: this.parseMoney(priceLines[index] ?? '') ?? 0,
        stock: this.parseInteger(stockLines[index] ?? '') ?? 0,
        sortOrder: options.length,
      });
    });

    return options;
  }

  private parseSingleOptions(
    row: ExcelJS.Row,
    headerMap: HeaderMap,
    names: string[],
    valuesRaw: string,
    errors: string[],
  ): ProductOptionInputDto[] {
    const options: ProductOptionInputDto[] = [];

    if (names.length === 1) {
      const values = this.splitList(valuesRaw);
      const prices = this.splitListPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionPrices));
      const stocks = this.splitListPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionStocks));
      const usables = this.splitListPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionUsables));
      values.forEach((value, index) => {
        if (!this.isOptionUsable(usables[index])) return;
        options.push({
          name: names[0],
          value,
          priceAdjustment: this.parseMoney(prices[index] ?? '') ?? 0,
          stock: this.parseInteger(stocks[index] ?? '') ?? 0,
          sortOrder: options.length,
        });
      });
      return options;
    }

    const valueLines = this.splitLines(valuesRaw);
    if (valueLines.length !== names.length) {
      errors.push('옵션값 줄 수가 옵션명 개수와 일치하지 않습니다.');
      return options;
    }
    const priceLines = this.splitLinesPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionPrices));
    const stockLines = this.splitLinesPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionStocks));
    const usableLines = this.splitLinesPreservingEmpty(this.getCellPreservingLineBoundaries(row, headerMap.optionUsables));

    names.forEach((name, nameIndex) => {
      const values = this.splitByComma(valueLines[nameIndex] ?? '');
      const prices = this.splitByCommaPreservingEmpty(priceLines[nameIndex] ?? '');
      const stocks = this.splitByCommaPreservingEmpty(stockLines[nameIndex] ?? '');
      const usables = this.splitByCommaPreservingEmpty(usableLines[nameIndex] ?? '');
      values.forEach((value, valueIndex) => {
        if (!this.isOptionUsable(usables[valueIndex])) return;
        options.push({
          name,
          value,
          priceAdjustment: this.parseMoney(prices[valueIndex] ?? '') ?? 0,
          stock: this.parseInteger(stocks[valueIndex] ?? '') ?? 0,
          sortOrder: options.length,
        });
      });
    });

    return options;
  }

  private isOptionUsable(raw: string | undefined): boolean {
    if (!raw) return true;
    const normalized = raw.replace(/\s/g, '').toLowerCase();
    return !(normalized === 'n' || normalized === 'no' || normalized === '사용안함' || normalized === 'x');
  }

  private collectValidImageUrls(urls: string[], errors: string[]): string[] {
    const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
    const valid: string[] = [];
    for (const url of unique) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('unsupported protocol');
        }
        valid.push(url);
      } catch {
        errors.push(`이미지 URL 형식이 올바르지 않습니다: ${url}`);
      }
    }
    return valid;
  }

  private extractHtmlImageUrls(html: string): string[] {
    if (!html || !html.includes('<img')) return [];
    const urls: string[] = [];
    const pattern = /<img\b[^>]*?src\s*=\s*["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  }

  // 원격 이미지 URL 을 다운로드해 스토리지에 업로드하고 DTO 의 URL 을 업로드된 URL 로 치환한다.
  // 같은 URL 은 커밋 한 번 동안 캐시를 공유해 중복 다운로드/저장을 방지한다.
  private async resolveRemoteImages(
    dto: CreateProductDto,
    cache: Map<string, Promise<UploadedFile>>,
  ): Promise<CreateProductDto> {
    const resolved: CreateProductDto = { ...dto };

    if (dto.images) {
      const images: NonNullable<CreateProductDto['images']> = [];
      for (const image of dto.images) {
        const uploaded = await this.ingestCached(image.url, cache);
        images.push({ ...image, url: uploaded.url });
      }
      resolved.images = images;
    }

    if (dto.detailImages) {
      const detailImages: NonNullable<CreateProductDto['detailImages']> = [];
      for (const detailImage of dto.detailImages) {
        const uploaded = await this.ingestCached(detailImage.url, cache);
        detailImages.push({ ...detailImage, url: uploaded.url });
      }
      resolved.detailImages = detailImages;
    }

    return resolved;
  }

  private ingestCached(url: string, cache: Map<string, Promise<UploadedFile>>): Promise<UploadedFile> {
    const cached = cache.get(url);
    if (cached) return cached;
    const promise = this.remoteImageIngestService.ingest(url);
    cache.set(url, promise);
    return promise;
  }

  private buildIdentifier(sellerCode: string, productNumber: string): string | null {
    const raw = sellerCode || (productNumber ? `naver-${productNumber}` : '');
    const normalized = raw.trim();
    return normalized || null;
  }

  private buildImages(productName: string, urls: string[]): CreateProductDto['images'] {
    if (urls.length === 0) return undefined;
    return urls.map((url, index) => ({
      url,
      alt: productName,
      sortOrder: index,
      isThumbnail: index === 0,
    }));
  }

  private mapStatus(rawSalesStatus: string, rawDisplayStatus: string, stock: number): ProductStatus {
    const normalized = `${rawSalesStatus} ${rawDisplayStatus}`.replace(/\s/g, '').toLowerCase();
    if (normalized.includes('숨김') || normalized.includes('전시중지') || normalized.includes('판매중지') || normalized.includes('hidden')) {
      return ProductStatus.HIDDEN;
    }
    if (normalized.includes('품절') || normalized.includes('soldout')) {
      return ProductStatus.SOLDOUT;
    }
    if (normalized.includes('임시') || normalized.includes('draft')) {
      return ProductStatus.DRAFT;
    }
    if (normalized.includes('판매중') || normalized.includes('active')) {
      return stock === 0 ? ProductStatus.SOLDOUT : ProductStatus.ACTIVE;
    }
    return stock === 0 ? ProductStatus.SOLDOUT : ProductStatus.ACTIVE;
  }

  private toUpdateDto(dto: CreateProductDto): UpdateProductDto {
    const rest: UpdateProductDto = { ...dto };
    delete rest.slug;
    return Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    ) as UpdateProductDto;
  }

  private async generateUniqueSlug(base: string): Promise<string> {
    let candidate = base || 'smartstore-product';
    let suffix = 2;
    while (await this.productRepository.findOne({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private buildResult(rows: SmartStoreImportRowResult[]): SmartStoreImportResult {
    const summary = rows.reduce(
      (acc, row) => {
        acc.totalRows += 1;
        if (row.action === 'create') acc.createCount += 1;
        if (row.action === 'update') acc.updateCount += 1;
        if (row.action === 'skip') acc.skipCount += 1;
        if (row.status === 'success') acc.successCount += 1;
        if (row.status === 'failed') acc.failureCount += 1;
        return acc;
      },
      { totalRows: 0, createCount: 0, updateCount: 0, skipCount: 0, successCount: 0, failureCount: 0 },
    );
    return { summary, rows };
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

  private getCell(row: ExcelJS.Row, columnNumber: number | undefined): string {
    if (!columnNumber) return '';
    return this.cellToString(row.getCell(columnNumber).value).trim();
  }

  private getCellPreservingLineBoundaries(row: ExcelJS.Row, columnNumber: number | undefined): string {
    if (!columnNumber) return '';
    return this.cellToString(row.getCell(columnNumber).value).replace(/^[ \t]+|[ \t]+$/g, '');
  }

  private cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      if ('text' in value && typeof value.text === 'string') return value.text;
      if ('result' in value) return this.cellToString(value.result as ExcelJS.CellValue);
      if ('richText' in value && Array.isArray(value.richText)) {
        return value.richText.map((part) => part.text).join('');
      }
      if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink;
      return String(value);
    }
    return String(value);
  }

  private normalizeHeader(header: string): string {
    return header.replace(/[\s_()\[\]{}./-]/g, '').toLowerCase();
  }

  private parseMoney(value: string): number | null {
    if (!value) return null;
    const normalized = value.replace(/[^0-9.-]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseInteger(value: string): number | null {
    const parsed = this.parseMoney(value);
    return parsed === null ? null : Math.max(0, Math.trunc(parsed));
  }

  private splitImageUrls(value: string): string[] {
    if (!value) return [];
    return value
      .split(/[\n,;|]/)
      .map((url) => url.trim())
      .filter(Boolean);
  }

  private splitLines(value: string): string[] {
    if (!value) return [];
    return value
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private splitLinesPreservingEmpty(value: string): string[] {
    if (!value) return [];
    return value
      .split(/\r?\n/)
      .map((part) => part.trim());
  }

  private splitByComma(value: string): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private splitByCommaPreservingEmpty(value: string): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map((part) => part.trim());
  }

  private splitList(value: string): string[] {
    if (!value) return [];
    return value
      .split(/[\r\n,]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private splitListPreservingEmpty(value: string): string[] {
    if (!value) return [];
    return value
      .split(/[\r\n,]/)
      .map((part) => part.trim());
  }

  private slugify(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 240);
    return slug || 'smartstore-product';
  }
}
