import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { In, Repository } from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { AttributeType } from './entities/attribute-type.entity';
import { ProductCommandService } from './product-command.service';
import { CreateProductDto, ProductNoticeInfoType, ProductOptionInputDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RemoteImageIngestService } from '../upload/remote-image-ingest.service';
import { RemoteImageIngestCache } from '../upload/remote-image-ingest.cache';
import { assertXlsxFile, cellToString, normalizeExcelHeader } from '../../common/imports/excel-import.util';
import { buildNaverExternalProductKey } from '../../common/imports/external-source.util';
import { AttributesService } from './attributes.service';
import {
  ProductKeywordAttributeMapping,
  ProductKeywordCategoryMapping,
  ProductKeywordMappingService,
  ProductKeywordOptionMapping,
} from './product-keyword-mapping.service';
import {
  resolveImportOptionsStock,
  SmartStoreImportStockSource,
} from './product-import-stock.util';

export type SmartStoreImportAction = 'create' | 'update' | 'skip';
export type { SmartStoreImportStockSource } from './product-import-stock.util';

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
  price: number | null;
  salePrice: number | null;
  hasDiscount: boolean;
  isFreeShipping: boolean | null;
  hasNoticeInfo: boolean;
  stock: number | null;
  optionStockTotal: number | null;
  stockSource: SmartStoreImportStockSource;
  automaticMapping: SmartStoreAutomaticMappingResult;
  mappingWarnings: string[];
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

export interface SmartStoreParsedProductRow {
  rowNumber: number;
  identifier: string | null;
  productName: string | null;
  dto: CreateProductDto | null;
  optionCount: number;
  galleryImageCount: number;
  detailImageCount: number;
  price: number | null;
  salePrice: number | null;
  hasDiscount: boolean;
  isFreeShipping: boolean | null;
  hasNoticeInfo: boolean;
  stock: number | null;
  optionStockTotal: number | null;
  stockSource: SmartStoreImportStockSource;
  errors: string[];
}

export interface SmartStoreAutomaticMappingResult {
  status: 'none' | 'mapped' | 'needs_review';
  category?: { slug: string; displayName: string; categoryId?: number };
  attributes: Array<{ code: string; value: string; displayValue: string; attributeTypeId?: number }>;
  options: Array<{ name: string; value: string }>;
  noticeInfoType?: ProductNoticeInfoType;
}

interface ResolvedProductKeywordMapping extends SmartStoreAutomaticMappingResult {
  category?: { slug: string; displayName: string; categoryId?: number };
  attributes: Array<{ code: string; value: string; displayValue: string; attributeTypeId?: number }>;
  options: ProductKeywordOptionMapping[];
  warnings: string[];
}

const MAX_IMPORT_ROWS = 500;

interface SmartStoreParsedRowsProcessOptions {
  unmatchedAction?: SmartStoreImportAction;
  unmatchedSkipMessage?: (identifier: string | null) => string;
}

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
  immediateDiscountValue: ['즉시할인 값 (기본할인)', '즉시할인값(기본할인)', '즉시할인 값', '기본할인 값'],
  immediateDiscountUnit: ['즉시할인 단위 (기본할인)', '즉시할인단위(기본할인)', '즉시할인 단위', '기본할인 단위'],
  stock: ['재고수량', '재고', '재고량'],
  salesStatus: ['판매상태'],
  displayStatus: ['전시상태'],
  productCondition: ['상품상태'],
  representativeImage: ['대표이미지', '대표 이미지', '대표이미지 URL', '대표 이미지 URL', '이미지 URL'],
  additionalImages: ['추가이미지', '추가 이미지', '추가이미지 URL', '추가 이미지 URL'],
  detailImages: ['상세이미지', '상세 이미지', '상세이미지 URL', '상세 이미지 URL'],
  description: ['상세설명', '상품상세', '상품 상세', '상세페이지', '상세 HTML'],
  shortDescription: ['요약설명', '짧은설명', '간단설명'],
  manufacturer: ['제조사', '제조자', '제조자/수입자'],
  origin: ['원산지 직접입력', '원산지', '제조국', '생산지'],
  asPhone: ['A/S 전화번호', 'AS 전화번호', '고객센터 전화번호', '소비자상담 전화번호', 'A/S 책임자와 전화번호'],
  asGuide: ['A/S 안내', 'AS 안내', '품질보증기준'],
  shippingFeeType: ['배송비유형', '배송비 유형'],
  baseShippingFee: ['기본배송비', '기본 배송비'],
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
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(AttributeType)
    private readonly attributeTypeRepository: Repository<AttributeType>,
    private readonly productCommandService: ProductCommandService,
    private readonly remoteImageIngestService: RemoteImageIngestService,
    private readonly productKeywordMappingService: ProductKeywordMappingService,
    private readonly attributesService: AttributesService,
  ) {}

  async preview(file: Express.Multer.File): Promise<SmartStoreImportResult> {
    return this.process(file, false);
  }

  async commit(file: Express.Multer.File): Promise<SmartStoreImportResult> {
    return this.process(file, true);
  }

  async previewParsedRows(
    parsedRows: SmartStoreParsedProductRow[],
    options: SmartStoreParsedRowsProcessOptions = {},
  ): Promise<SmartStoreImportResult> {
    return this.processParsedRows(parsedRows, false, options);
  }

  async commitParsedRows(
    parsedRows: SmartStoreParsedProductRow[],
    options: SmartStoreParsedRowsProcessOptions = {},
  ): Promise<SmartStoreImportResult> {
    return this.processParsedRows(parsedRows, true, options);
  }

  private async process(file: Express.Multer.File, commit: boolean): Promise<SmartStoreImportResult> {
    this.assertExcelFile(file);
    const parsedRows = await this.parseWorkbook(file.buffer);
    return this.processParsedRows(parsedRows, commit);
  }

  private async processParsedRows(
    parsedRows: SmartStoreParsedProductRow[],
    commit: boolean,
    options: SmartStoreParsedRowsProcessOptions = {},
  ): Promise<SmartStoreImportResult> {
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
    const resolvedMappings = await this.resolveKeywordMappings(parsedRows);
    const ingestCache = new RemoteImageIngestCache(this.remoteImageIngestService);
    const rows: SmartStoreImportRowResult[] = [];

    for (const parsed of parsedRows) {
      const keywordMapping = resolvedMappings.get(parsed.rowNumber) ?? this.emptyResolvedMapping();
      const errors = [...parsed.errors];
      if (parsed.identifier && duplicateIdentifiers.has(parsed.identifier)) {
        errors.push(`파일 안에서 중복된 상품 식별자입니다: ${parsed.identifier}`);
      }
      const hasBlockingErrors = errors.length > 0;

      const existing = parsed.identifier ? existingBySku.get(parsed.identifier) : undefined;
      const action: SmartStoreImportAction = hasBlockingErrors ? 'skip' : existing ? 'update' : (options.unmatchedAction ?? 'create');
      if (!existing && !hasBlockingErrors && action === 'skip') {
        errors.push(options.unmatchedSkipMessage?.(parsed.identifier) ?? '일치하는 자사몰 상품이 없어 스킵합니다.');
      }
      const rowResult: SmartStoreImportRowResult = {
        rowNumber: parsed.rowNumber,
        identifier: parsed.identifier,
        productName: parsed.productName,
        action,
        status: hasBlockingErrors ? 'failed' : commit && action !== 'skip' ? 'success' : 'valid',
        productId: existing?.id,
        optionCount: parsed.optionCount,
        galleryImageCount: parsed.galleryImageCount,
        detailImageCount: parsed.detailImageCount,
        price: parsed.price,
        salePrice: parsed.salePrice,
        hasDiscount: parsed.hasDiscount,
        isFreeShipping: parsed.isFreeShipping,
        hasNoticeInfo: parsed.hasNoticeInfo,
        stock: parsed.stock,
        optionStockTotal: parsed.optionStockTotal,
        stockSource: parsed.stockSource,
        automaticMapping: this.toRowAutomaticMapping(keywordMapping),
        mappingWarnings: keywordMapping.warnings,
        errors,
      };

      if (commit && !hasBlockingErrors && action !== 'skip' && parsed.dto) {
        try {
          const mappedDto = this.applyKeywordMapping(parsed.dto, keywordMapping);
          const dto = await this.resolveRemoteImages(mappedDto, ingestCache);
          const saved = existing
            ? await this.productCommandService.update(existing.id, this.toUpdateDto(dto))
            : await this.productCommandService.create({
                ...dto,
                slug: await this.generateUniqueSlug(dto.slug),
              });
          await this.syncKeywordAttributes(saved.id, keywordMapping);
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
    assertXlsxFile(file, '스마트스토어 상품');
  }

  private async parseWorkbook(buffer: Buffer): Promise<SmartStoreParsedProductRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const format = this.detectFormat(workbook);
    const headerMap = this.buildHeaderMap(format.worksheet.getRow(format.headerRowNumber));
    if (!headerMap.name || !headerMap.price) {
      throw new BadRequestException('필수 컬럼을 찾을 수 없습니다: 상품명, 판매가. 지원 포맷은 스마트스토어 상품목록 다운로드형 또는 일괄수정 XLSX형입니다.');
    }

    const rows: SmartStoreParsedProductRow[] = [];
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

  private parseRow(row: ExcelJS.Row, rowNumber: number, headerMap: HeaderMap): SmartStoreParsedProductRow {
    const productNumber = this.getCell(row, headerMap.productNumber);
    const sellerCode = this.getCell(row, headerMap.sellerCode);
    const productName = this.getCell(row, headerMap.name);
    const identifier = this.buildIdentifier(sellerCode, productNumber);
    const errors: string[] = [];

    if (!identifier) errors.push('상품번호 또는 판매자상품코드가 필요합니다.');
    if (!productName) errors.push('상품명이 필요합니다.');

    const price = this.parseMoney(this.getCell(row, headerMap.price));
    if (price === null || price < 1) errors.push('판매가는 1원 이상이어야 합니다.');

    const rawStock = this.parseInteger(this.getCell(row, headerMap.stock));
    const salePrice = this.resolveSalePrice(row, headerMap, price);
    const description = this.getCell(row, headerMap.description);
    const isFreeShipping = this.parseFreeShipping(row, headerMap);
    const noticeInfo = this.buildNoticeInfo(row, headerMap, productName);

    const parsedOptions = this.parseOptions(row, headerMap, errors);
    const { options, stock, optionStockTotal, stockSource } = resolveImportOptionsStock(
      rawStock,
      parsedOptions,
    );
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
          isFreeShipping,
          isVisibleKo: true,
          isVisibleEn: false,
          noticeInfo,
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
      price,
      salePrice: salePrice ?? null,
      hasDiscount: salePrice !== undefined && price !== null && salePrice < price,
      isFreeShipping: isFreeShipping ?? null,
      hasNoticeInfo: Boolean(noticeInfo),
      stock,
      optionStockTotal,
      stockSource,
      errors,
    };
  }

  private async resolveKeywordMappings(parsedRows: SmartStoreParsedProductRow[]): Promise<Map<number, ResolvedProductKeywordMapping>> {
    const analyzed = parsedRows.map((row) => ({
      rowNumber: row.rowNumber,
      result: this.productKeywordMappingService.analyzeProductName(row.productName),
      hasExplicitOptions: (row.optionCount ?? 0) > 0,
    }));
    const categorySlugs = [...new Set(analyzed.map((item) => item.result.category?.slug).filter((slug): slug is string => Boolean(slug)))];
    const attributeCodes = [...new Set(analyzed.flatMap((item) => item.result.attributes.map((attribute) => attribute.code)))];

    const categories = categorySlugs.length > 0
      ? await this.categoryRepository.find({ where: { slug: In(categorySlugs), isActive: true } })
      : [];
    const attributeTypes = attributeCodes.length > 0
      ? await this.attributeTypeRepository.find({ where: { code: In(attributeCodes), isActive: true } })
      : [];
    const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
    const attributeTypeByCode = new Map(attributeTypes.map((type) => [type.code, type]));
    const resolved = new Map<number, ResolvedProductKeywordMapping>();

    analyzed.forEach((item) => {
      const warnings = [...item.result.warnings];
      const category = item.result.category ? this.resolveCategoryMapping(item.result.category, categoryBySlug, warnings) : undefined;
      const attributes = item.result.attributes.map((attribute) => this.resolveAttributeMapping(attribute, attributeTypeByCode, warnings));
      const options = item.result.options;
      if (item.hasExplicitOptions && options.length > 0) {
        warnings.push('원본 파일에 명시 옵션이 있어 상품명 기반 옵션 후보는 미리보기만 표시하고 자동 반영하지 않습니다.');
      }
      resolved.set(item.rowNumber, {
        status: this.resolveAutomaticMappingStatus(category, attributes, options, item.result.noticeInfoType, warnings),
        ...(category ? { category } : {}),
        attributes,
        options,
        ...(item.result.noticeInfoType ? { noticeInfoType: item.result.noticeInfoType } : {}),
        warnings,
      });
    });

    return resolved;
  }

  private resolveCategoryMapping(
    category: ProductKeywordCategoryMapping,
    categoryBySlug: Map<string, Category>,
    warnings: string[],
  ): ResolvedProductKeywordMapping['category'] {
    const matched = categoryBySlug.get(category.slug);
    if (!matched) {
      warnings.push(`자동 매핑 카테고리 '${category.displayName}'(${category.slug})를 찾을 수 없어 categoryId는 반영하지 않습니다.`);
      return { slug: category.slug, displayName: category.displayName };
    }
    return { slug: category.slug, displayName: category.displayName, categoryId: Number(matched.id) };
  }

  private resolveAttributeMapping(
    attribute: ProductKeywordAttributeMapping,
    attributeTypeByCode: Map<string, AttributeType>,
    warnings: string[],
  ): ResolvedProductKeywordMapping['attributes'][number] {
    const matched = attributeTypeByCode.get(attribute.code);
    if (!matched) {
      warnings.push(`자동 매핑 속성 타입 '${attribute.code}'를 찾을 수 없어 해당 속성은 저장하지 않습니다.`);
      return { code: attribute.code, value: attribute.value, displayValue: attribute.displayValue };
    }
    return { code: attribute.code, value: attribute.value, displayValue: attribute.displayValue, attributeTypeId: Number(matched.id) };
  }

  private resolveAutomaticMappingStatus(
    category: ResolvedProductKeywordMapping['category'] | undefined,
    attributes: ResolvedProductKeywordMapping['attributes'],
    options: ProductKeywordOptionMapping[],
    noticeInfoType: ProductNoticeInfoType | undefined,
    warnings: string[],
  ): SmartStoreAutomaticMappingResult['status'] {
    const hasMapping = Boolean(category) || attributes.length > 0 || options.length > 0 || Boolean(noticeInfoType);
    if (!hasMapping) return 'none';
    return warnings.length > 0 ? 'needs_review' : 'mapped';
  }

  private applyKeywordMapping(dto: CreateProductDto, mapping: ResolvedProductKeywordMapping): CreateProductDto {
    const capacity = mapping.attributes.find((attribute) => attribute.code === 'capacity');
    const mappedSizeCapacity = capacity?.displayValue ?? capacity?.value;
    const noticeInfo = mapping.noticeInfoType || mappedSizeCapacity
      ? {
          ...(dto.noticeInfo ?? {}),
          ...(mapping.noticeInfoType ? { type: mapping.noticeInfoType } : {}),
          productName: dto.noticeInfo?.productName ?? dto.name,
          sizeCapacity: dto.noticeInfo?.sizeCapacity ?? mappedSizeCapacity,
        }
      : dto.noticeInfo;

    return {
      ...dto,
      ...(mapping.category?.categoryId ? { categoryId: mapping.category.categoryId } : {}),
      ...(noticeInfo ? { noticeInfo } : {}),
      ...(dto.options === undefined && mapping.options.length > 0
        ? { options: mapping.options.map(({ keyword: _keyword, ...option }) => option) }
        : {}),
    };
  }

  private async syncKeywordAttributes(productId: number, mapping: ResolvedProductKeywordMapping): Promise<void> {
    const attributes = mapping.attributes
      .filter((attribute): attribute is Required<ResolvedProductKeywordMapping['attributes'][number]> => attribute.attributeTypeId !== undefined)
      .map((attribute, index) => ({
        attributeTypeId: attribute.attributeTypeId,
        value: attribute.value,
        displayValue: attribute.displayValue,
        sortOrder: index,
      }));
    if (attributes.length === 0) return;
    await Promise.all(
      attributes.map((attribute) =>
        this.attributesService.createOrUpdateProductAttribute(productId, attribute.attributeTypeId, {
          productId,
          attributeTypeId: attribute.attributeTypeId,
          value: attribute.value,
          displayValue: attribute.displayValue,
          sortOrder: attribute.sortOrder,
        }),
      ),
    );
  }

  private emptyResolvedMapping(): ResolvedProductKeywordMapping {
    return { status: 'none', attributes: [], options: [], warnings: [] };
  }

  private toRowAutomaticMapping(mapping: ResolvedProductKeywordMapping): SmartStoreAutomaticMappingResult {
    return {
      status: mapping.status,
      ...(mapping.category ? { category: mapping.category } : {}),
      attributes: mapping.attributes,
      options: mapping.options.map((option) => ({ name: option.name, value: option.value })),
      ...(mapping.noticeInfoType ? { noticeInfoType: mapping.noticeInfoType } : {}),
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
    cache: RemoteImageIngestCache,
  ): Promise<CreateProductDto> {
    const resolved: CreateProductDto = { ...dto };

    if (dto.images) {
      const images: NonNullable<CreateProductDto['images']> = [];
      for (const image of dto.images) {
        const uploaded = await cache.ingest(image.url);
        images.push({ ...image, url: uploaded.url });
      }
      resolved.images = images;
    }

    if (dto.detailImages) {
      const detailImages: NonNullable<CreateProductDto['detailImages']> = [];
      for (const detailImage of dto.detailImages) {
        const uploaded = await cache.ingest(detailImage.url);
        detailImages.push({ ...detailImage, url: uploaded.url });
      }
      resolved.detailImages = detailImages;
    }

    return resolved;
  }


  private buildIdentifier(sellerCode: string, productNumber: string): string | null {
    const raw = sellerCode || buildNaverExternalProductKey(productNumber) || '';
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

  private resolveSalePrice(row: ExcelJS.Row, headerMap: HeaderMap, price: number | null): number | undefined {
    const explicitSalePrice = this.parseMoney(this.getCell(row, headerMap.salePrice));
    if (explicitSalePrice !== null) return explicitSalePrice;

    if (price === null) return undefined;
    const discountValue = this.parseMoney(this.getCell(row, headerMap.immediateDiscountValue));
    if (discountValue === null || discountValue <= 0) return undefined;

    const discountUnit = this.getCell(row, headerMap.immediateDiscountUnit).replace(/\s/g, '');
    if (discountUnit === '%') {
      return Math.max(0, Math.round(price * (100 - discountValue) / 100));
    }
    if (discountUnit === '원' || !discountUnit) {
      return Math.max(0, price - discountValue);
    }
    return undefined;
  }

  private parseFreeShipping(row: ExcelJS.Row, headerMap: HeaderMap): boolean | undefined {
    const feeType = this.getCell(row, headerMap.shippingFeeType).replace(/\s/g, '').toLowerCase();
    if (feeType.includes('무료') && !feeType.includes('조건부')) return true;
    if (feeType.includes('유료') || feeType.includes('조건부') || feeType.includes('수량별') || feeType.includes('구간별')) return false;

    const baseShippingFee = this.parseMoney(this.getCell(row, headerMap.baseShippingFee));
    if (baseShippingFee === 0) return true;
    if (baseShippingFee !== null && baseShippingFee > 0) return false;
    return undefined;
  }

  private buildNoticeInfo(
    row: ExcelJS.Row,
    headerMap: HeaderMap,
    productName: string,
  ): CreateProductDto['noticeInfo'] {
    const manufacturer = this.getCell(row, headerMap.manufacturer);
    const origin = this.getCell(row, headerMap.origin);
    const asPhone = this.getCell(row, headerMap.asPhone);
    const asGuide = this.getCell(row, headerMap.asGuide);

    if (!manufacturer && !origin && !asPhone && !asGuide) return undefined;

    return {
      type: ProductNoticeInfoType.TEAWARE,
      productName,
      manufacturer: manufacturer || undefined,
      countryOfOrigin: origin || undefined,
      origin: origin || undefined,
      asContact: asPhone || undefined,
      warrantyPolicy: asGuide || undefined,
    };
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
    return cellToString(value);
  }

  private normalizeHeader(header: string): string {
    return normalizeExcelHeader(header);
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
