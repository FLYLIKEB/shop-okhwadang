import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { In, Repository } from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity';
import { ProductCommandService } from './product-command.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export type SmartStoreImportAction = 'create' | 'update' | 'skip';

export interface SmartStoreImportRowResult {
  rowNumber: number;
  identifier: string | null;
  productName: string | null;
  action: SmartStoreImportAction;
  status: 'valid' | 'failed' | 'success';
  productId?: number;
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
  errors: string[];
}

const MAX_IMPORT_ROWS = 500;

const HEADER_ALIASES = {
  productNumber: ['상품번호', '스마트스토어 상품번호', '네이버상품번호', '상품 ID', '상품ID'],
  sellerCode: ['판매자 상품코드', '판매자상품코드', '판매자 관리코드', '자체 상품코드', 'SKU', 'sku'],
  name: ['상품명', '상품 이름', '제품명'],
  price: ['판매가', '상품가격', '가격', '정상가'],
  salePrice: ['할인가', '즉시할인가', '할인 판매가'],
  stock: ['재고수량', '재고', '재고량'],
  status: ['판매상태', '상품상태', '전시상태'],
  representativeImage: ['대표이미지', '대표 이미지', '대표이미지 URL', '대표 이미지 URL', '이미지 URL'],
  additionalImages: ['추가이미지', '추가 이미지', '추가이미지 URL', '추가 이미지 URL'],
  description: ['상세설명', '상품상세', '상품 상세', '상세페이지', '상세 HTML'],
  shortDescription: ['요약설명', '짧은설명', '간단설명'],
} as const;

type HeaderKey = keyof typeof HEADER_ALIASES;

type HeaderMap = Partial<Record<HeaderKey, number>>;

@Injectable()
export class SmartStoreProductImportService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly productCommandService: ProductCommandService,
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
        errors,
      };

      if (commit && errors.length === 0 && parsed.dto) {
        try {
          const saved = existing
            ? await this.productCommandService.update(existing.id, this.toUpdateDto(parsed.dto))
            : await this.productCommandService.create({
                ...parsed.dto,
                slug: await this.generateUniqueSlug(parsed.dto.slug),
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
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('엑셀 파일에서 시트를 찾을 수 없습니다.');
    }

    const headerRowNumber = this.findHeaderRowNumber(worksheet);
    const headerMap = this.buildHeaderMap(worksheet.getRow(headerRowNumber));
    if (!headerMap.name || !headerMap.price) {
      throw new BadRequestException('상품명과 판매가 컬럼을 찾을 수 없습니다. 스마트스토어 상품 엑셀 양식을 확인해 주세요.');
    }

    const rows: ParsedSmartStoreRow[] = [];
    const seenDataRows = worksheet.rowCount - headerRowNumber;
    if (seenDataRows > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`한 번에 최대 ${MAX_IMPORT_ROWS}개 상품까지만 업로드할 수 있습니다.`);
    }

    for (let rowNumber = headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
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

  private findHeaderRowNumber(worksheet: ExcelJS.Worksheet): number {
    for (let rowNumber = 1; rowNumber <= Math.min(10, worksheet.rowCount); rowNumber += 1) {
      const headerMap = this.buildHeaderMap(worksheet.getRow(rowNumber));
      if (headerMap.name && headerMap.price) {
        return rowNumber;
      }
    }
    return 1;
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
    const representativeImage = this.getCell(row, headerMap.representativeImage);
    const additionalImages = this.splitImageUrls(this.getCell(row, headerMap.additionalImages));

    const dto: CreateProductDto | null = errors.length > 0 || !identifier || !productName || price === null
      ? null
      : {
          name: productName,
          slug: this.slugify(identifier),
          price,
          salePrice: salePrice ?? undefined,
          stock: stock ?? 0,
          sku: identifier,
          status: this.mapStatus(this.getCell(row, headerMap.status), stock ?? 0),
          shortDescription: this.getCell(row, headerMap.shortDescription) || undefined,
          description: this.getCell(row, headerMap.description) || undefined,
          images: this.buildImages(productName, representativeImage, additionalImages),
        };

    return { rowNumber, identifier, productName, dto, errors };
  }

  private buildIdentifier(sellerCode: string, productNumber: string): string | null {
    const raw = sellerCode || (productNumber ? `naver-${productNumber}` : '');
    const normalized = raw.trim();
    return normalized || null;
  }

  private buildImages(productName: string, representativeImage: string, additionalImages: string[]): CreateProductDto['images'] {
    const urls = [representativeImage, ...additionalImages].filter(Boolean);
    if (urls.length === 0) return undefined;
    return urls.map((url, index) => ({
      url,
      alt: productName,
      sortOrder: index,
      isThumbnail: index === 0,
    }));
  }

  private mapStatus(rawStatus: string, stock: number): ProductStatus {
    const normalized = rawStatus.replace(/\s/g, '').toLowerCase();
    if (normalized.includes('판매중') || normalized.includes('active')) {
      return stock === 0 ? ProductStatus.SOLDOUT : ProductStatus.ACTIVE;
    }
    if (normalized.includes('품절') || normalized.includes('soldout')) {
      return ProductStatus.SOLDOUT;
    }
    if (normalized.includes('숨김') || normalized.includes('전시중지') || normalized.includes('판매중지') || normalized.includes('hidden')) {
      return ProductStatus.HIDDEN;
    }
    if (normalized.includes('임시') || normalized.includes('draft')) {
      return ProductStatus.DRAFT;
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
