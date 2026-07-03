import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';
import { ProductStatus, Product } from '../entities/product.entity';
import { SmartStoreProductImportService } from '../smartstore-product-import.service';
import { ProductCommandService } from '../product-command.service';
import { RemoteImageIngestService } from '../../upload/remote-image-ingest.service';

function createRepositoryMock(existingProducts: Product[] = []) {
  return {
    find: jest.fn().mockResolvedValue(existingProducts),
    findOne: jest.fn().mockResolvedValue(null),
  };
}

function createCommandServiceMock() {
  return {
    create: jest.fn().mockImplementation(async (dto) => ({ id: 100, ...dto })),
    update: jest.fn().mockImplementation(async (id, dto) => ({ id, ...dto })),
  };
}

function createIngestServiceMock() {
  return {
    ingest: jest.fn().mockImplementation(async (url: string) => ({
      url: `https://cdn.okhwadang.com/uploads/${encodeURIComponent(url)}`,
      filename: 'uploaded.jpg',
    })),
  };
}

function ingestedUrl(url: string): string {
  return `https://cdn.okhwadang.com/uploads/${encodeURIComponent(url)}`;
}

function createService(
  repository: ReturnType<typeof createRepositoryMock>,
  commandService: ReturnType<typeof createCommandServiceMock>,
  ingestService: ReturnType<typeof createIngestServiceMock> = createIngestServiceMock(),
) {
  return new SmartStoreProductImportService(
    repository as never,
    commandService as unknown as ProductCommandService,
    ingestService as unknown as RemoteImageIngestService,
  );
}

async function createWorkbookBuffer(rows: Array<Array<string | number>>, sheetName = 'products') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  rows.forEach((row) => worksheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function createFile(buffer: Buffer, overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'smartstore-products.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as unknown as Express.Multer.File['stream'],
    ...overrides,
  };
}

describe('SmartStoreProductImportService', () => {
  it('previews create and update actions by SKU without saving', async () => {
    const existing = { id: 7, sku: 'SKU-2', slug: 'old-product' } as Product;
    const repository = createRepositoryMock([existing]);
    const commandService = createCommandServiceMock();
    const ingestService = createIngestServiceMock();
    const service = createService(repository, commandService, ingestService);
    const buffer = await createWorkbookBuffer([
      ['상품번호', '판매자상품코드', '상품명', '판매가', '재고수량', '판매상태', '대표이미지 URL'],
      ['111', 'SKU-1', '신규 상품', 12000, 3, '판매중', 'https://cdn.example.com/1.jpg'],
      ['222', 'SKU-2', '기존 상품', '9,000', 0, '판매중', ''],
    ]);

    const result = await service.preview(createFile(buffer));

    expect(result.summary).toMatchObject({ totalRows: 2, createCount: 1, updateCount: 1, skipCount: 0 });
    expect(result.rows.map((row) => row.action)).toEqual(['create', 'update']);
    expect(result.rows[1].productId).toBe(7);
    expect(commandService.create).not.toHaveBeenCalled();
    expect(commandService.update).not.toHaveBeenCalled();
    expect(ingestService.ingest).not.toHaveBeenCalled();
  });

  it('commits valid rows and maps SmartStore fields to product DTOs', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['상품번호', '판매자상품코드', '상품명', '판매가', '재고수량', '판매상태', '대표이미지 URL', '상세설명'],
      ['111', 'SKU-1', '신규 상품', '12,000원', 3, '판매중', 'https://cdn.example.com/1.jpg', '<p>상세</p>'],
    ]);

    const result = await service.commit(createFile(buffer));

    expect(result.summary).toMatchObject({ successCount: 1, failureCount: 0, createCount: 1 });
    expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
      name: '신규 상품',
      sku: 'SKU-1',
      price: 12000,
      stock: 3,
      status: ProductStatus.ACTIVE,
      description: '<p>상세</p>',
      images: [expect.objectContaining({ url: ingestedUrl('https://cdn.example.com/1.jpg'), isThumbnail: true })],
    }));
  });

  it('maps SmartStore shipping, discount, and notice columns from bulk-edit exports', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['상품 기본정보', '상품 기본정보', '상품 기본정보', '상품 기본정보', '상품 주요정보', '상품 주요정보', '배송정보', '배송정보', '배송정보', 'A/S, 특이사항', 'A/S, 특이사항', '할인/혜택정보', '할인/혜택정보'],
      ['상품번호', '상품명', '판매가', '재고수량', '제조사', '원산지 직접입력', '배송비유형', '기본배송비', '반품배송비', 'A/S 전화번호', 'A/S 안내', '즉시할인 값 (기본할인)', '즉시할인 단위 (기본할인)'],
      ['필수', '필수', '필수', '필수', '비필수', '조건부필수', '조건부필수', '조건부필수', '조건부필수', '조건부필수', '조건부필수', '비필수', '비필수'],
      ['작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드'],
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['13629303355', '옥화당 자사호 홍위주니 연자호 100cc', 500000, 15, '옥화당', '중국산(옥화당)', '무료', 0, 5000, '01029080393', '품질 보증 및 관리 안내', 20, '%'],
    ], '일괄수정');

    const result = await service.commit(createFile(buffer));

    expect(result.rows[0]).toEqual(expect.objectContaining({
      price: 500000,
      salePrice: 400000,
      hasDiscount: true,
      isFreeShipping: true,
      hasNoticeInfo: true,
    }));
    expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
      sku: 'naver-13629303355',
      price: 500000,
      salePrice: 400000,
      isFreeShipping: true,
      noticeInfo: expect.objectContaining({
        type: 'teaware',
        productName: '옥화당 자사호 홍위주니 연자호 100cc',
        manufacturer: '옥화당',
        countryOfOrigin: '중국산(옥화당)',
        origin: '중국산(옥화당)',
        asContact: '01029080393 / 품질 보증 및 관리 안내',
        warrantyPolicy: '품질 보증 및 관리 안내',
      }),
    }));
  });

  it('maps non-free SmartStore shipping and won discounts', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['판매자상품코드', '상품명', '판매가', '배송비유형', '기본배송비', '즉시할인 값 (기본할인)', '즉시할인 단위 (기본할인)'],
      ['SKU-PAID', '유료 배송 상품', 30000, '유료', 3000, 5000, '원'],
    ]);

    const result = await service.commit(createFile(buffer));

    expect(result.rows[0]).toEqual(expect.objectContaining({
      price: 30000,
      salePrice: 25000,
      hasDiscount: true,
      isFreeShipping: false,
      hasNoticeInfo: false,
    }));
    expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
      sku: 'SKU-PAID',
      salePrice: 25000,
      isFreeShipping: false,
    }));
  });

  it('updates existing products without changing slug or clearing omitted optional fields', async () => {
    const existing = { id: 7, sku: 'SKU-2', slug: 'old-product' } as Product;
    const repository = createRepositoryMock([existing]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['판매자상품코드', '상품명', '판매가', '재고수량'],
      ['SKU-2', '기존 상품', 9000, 2],
    ]);

    await service.commit(createFile(buffer));

    expect(commandService.update).toHaveBeenCalledWith(7, expect.not.objectContaining({
      slug: expect.any(String),
      description: undefined,
      salePrice: undefined,
      images: expect.anything(),
      detailImages: expect.anything(),
      options: expect.anything(),
    }));
    expect(commandService.update).toHaveBeenCalledWith(7, expect.objectContaining({
      name: '기존 상품',
      sku: 'SKU-2',
      price: 9000,
    }));
  });

  it('uses naver product number as fallback identifier and marks zero-stock active rows as soldout', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['상품번호', '상품명', '판매가', '재고수량', '판매상태'],
      ['98765', '번호만 있는 상품', 5000, 0, '판매중'],
    ]);

    await service.commit(createFile(buffer));

    expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
      sku: 'naver-98765',
      status: ProductStatus.SOLDOUT,
    }));
  });

  it('parses SmartStore list-export headers including 상품번호(스마트스토어)', async () => {
    const existing = { id: 7, sku: 'naver-98765', slug: 'old-product' } as Product;
    const repository = createRepositoryMock([existing]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['상품번호(스마트스토어)', '상품명', '판매가', '재고수량', '판매상태', '전시상태'],
      ['98765', '목록 다운로드 상품', 5000, 2, '판매중', '전시중'],
    ]);

    const result = await service.preview(createFile(buffer));

    expect(result.summary).toMatchObject({ totalRows: 1, updateCount: 1 });
    expect(result.rows[0]).toMatchObject({ identifier: 'naver-98765', action: 'update' });
  });

  it('skips SmartStore bulk-edit guide rows and ignores 상품상태 when mapping sales status', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['기본정보', '기본정보', '가격정보', '상태정보', '상태정보', '상태정보'],
      ['상품번호(스마트스토어)', '상품명', '판매가', '재고수량', '판매상태', '상품상태'],
      ['필수', '필수', '필수', '선택', '선택', '선택'],
      ['작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드', '작성 가이드'],
      ['추가 안내', '추가 안내', '추가 안내', '추가 안내', '추가 안내', '추가 안내'],
      ['111', '일괄수정 상품 A', 12000, 3, '판매중', '신상품'],
      ['222', '일괄수정 상품 B', 15000, 0, '판매중', '중고상품'],
    ], '일괄수정');

    const result = await service.commit(createFile(buffer));

    expect(result.summary).toMatchObject({ totalRows: 2, createCount: 2, successCount: 2, failureCount: 0 });
    expect(result.rows.map((row) => row.rowNumber)).toEqual([6, 7]);
    expect(commandService.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sku: 'naver-111',
      status: ProductStatus.ACTIVE,
    }));
    expect(commandService.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      sku: 'naver-222',
      status: ProductStatus.SOLDOUT,
    }));
  });

  it('uses 전시상태 and 판매상태 semantics without treating 상품상태 as a visibility alias', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['상품번호', '상품명', '판매가', '재고수량', '상품상태', '전시상태'],
      ['111', '숨김 상품', 12000, 3, '신상품', '전시중지'],
    ]);

    await service.commit(createFile(buffer));

    expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
      sku: 'naver-111',
      status: ProductStatus.HIDDEN,
    }));
  });

  it('rejects invalid file types before parsing', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);

    await expect(service.preview(createFile(Buffer.from('x'), {
      originalname: 'products.csv',
      mimetype: 'text/csv',
    }))).rejects.toThrow(BadRequestException);
  });

  it('skips rows with missing required values or duplicate identifiers', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = createService(repository, commandService);
    const buffer = await createWorkbookBuffer([
      ['판매자상품코드', '상품명', '판매가'],
      ['SKU-1', '', 1000],
      ['SKU-2', '중복 A', 1000],
      ['SKU-2', '중복 B', 1000],
    ]);

    const result = await service.preview(createFile(buffer));

    expect(result.summary).toMatchObject({ totalRows: 3, skipCount: 3, failureCount: 3 });
    expect(result.rows[0].errors).toContain('상품명이 필요합니다.');
    expect(result.rows[1].errors[0]).toContain('중복된 상품 식별자');
  });

  describe('옵션 가져오기', () => {
    it('parses 조합형 options into ProductOption inputs', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '옵션형태', '옵션명', '옵션값', '옵션가', '옵션 재고수량', '옵션 사용여부'],
        ['SKU-1', '조합형 상품', 10000, '조합형', '색상,용량', '홍니,100cc\n자니,200cc', '0\n5000', '3\n7', 'Y\nY'],
      ]);

      await service.commit(createFile(buffer));

      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
        options: [
          expect.objectContaining({ name: '색상/용량', value: '홍니/100cc', priceAdjustment: 0, stock: 3, sortOrder: 0 }),
          expect.objectContaining({ name: '색상/용량', value: '자니/200cc', priceAdjustment: 5000, stock: 7, sortOrder: 1 }),
        ],
      }));
    });

    it('parses 단독형 options with a single option name', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '옵션형태', '옵션명', '옵션값', '옵션가', '옵션 재고수량'],
        ['SKU-1', '단독형 상품', 10000, '단독형', '용량', '100cc,200cc', '0,3000', '5,2'],
      ]);

      await service.commit(createFile(buffer));

      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
        options: [
          expect.objectContaining({ name: '용량', value: '100cc', priceAdjustment: 0, stock: 5 }),
          expect.objectContaining({ name: '용량', value: '200cc', priceAdjustment: 3000, stock: 2 }),
        ],
      }));
    });

    it('keeps option price and stock alignment when optional cells contain blanks', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '옵션형태', '옵션명', '옵션값', '옵션가', '옵션 재고수량', '옵션 사용여부'],
        ['SKU-1', '빈 옵션 보조값 상품', 10000, '단독형', '용량', '100cc,200cc,300cc', ',3000,', '5,,9', 'Y,,N'],
      ]);

      await service.commit(createFile(buffer));

      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
        options: [
          expect.objectContaining({ value: '100cc', priceAdjustment: 0, stock: 5 }),
          expect.objectContaining({ value: '200cc', priceAdjustment: 3000, stock: 0 }),
        ],
      }));
    });

    it('keeps 조합형 option line alignment when price or stock lines are blank', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '옵션형태', '옵션명', '옵션값', '옵션가', '옵션 재고수량'],
        ['SKU-1', '조합형 빈 보조값 상품', 10000, '조합형', '색상,용량', '홍니,100cc\n자니,200cc', '\n5000', '3\n'],
      ]);

      await service.commit(createFile(buffer));

      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
        options: [
          expect.objectContaining({ value: '홍니/100cc', priceAdjustment: 0, stock: 3 }),
          expect.objectContaining({ value: '자니/200cc', priceAdjustment: 5000, stock: 0 }),
        ],
      }));
    });

    it('skips options marked 사용안함 and keeps 설정안함 rows optionless', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '옵션형태', '옵션명', '옵션값', '옵션 사용여부'],
        ['SKU-1', '옵션 상품', 10000, '단독형', '용량', '100cc,200cc', 'Y,N'],
        ['SKU-2', '단일 상품', 5000, '설정안함', '', '', ''],
      ]);

      await service.commit(createFile(buffer));

      expect(commandService.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
        options: [expect.objectContaining({ value: '100cc' })],
      }));
      expect(commandService.create).toHaveBeenNthCalledWith(2, expect.not.objectContaining({
        options: expect.anything(),
      }));
    });

    it('reports option value count mismatch as a row error', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '옵션형태', '옵션명', '옵션값'],
        ['SKU-1', '불일치 상품', 10000, '조합형', '색상,용량', '홍니\n자니,200cc'],
      ]);

      const result = await service.preview(createFile(buffer));

      expect(result.rows[0].action).toBe('skip');
      expect(result.rows[0].errors.join(' ')).toContain('옵션값');
      expect(commandService.create).not.toHaveBeenCalled();
    });

    it('includes option counts in preview rows', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '옵션형태', '옵션명', '옵션값'],
        ['SKU-1', '옵션 상품', 10000, '단독형', '용량', '100cc,200cc,300cc'],
      ]);

      const result = await service.preview(createFile(buffer));

      expect(result.rows[0].optionCount).toBe(3);
    });
  });

  describe('이미지 가져오기', () => {
    it('ingests multiple 추가이미지 URLs in order and marks the representative image as thumbnail', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const ingestService = createIngestServiceMock();
      const service = createService(repository, commandService, ingestService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '대표이미지', '추가이미지'],
        ['SKU-1', '이미지 상품', 10000, 'https://img.example.com/rep.jpg', 'https://img.example.com/a.jpg\nhttps://img.example.com/b.jpg'],
      ]);

      await service.commit(createFile(buffer));

      expect(ingestService.ingest).toHaveBeenCalledTimes(3);
      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
        images: [
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/rep.jpg'), sortOrder: 0, isThumbnail: true }),
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/a.jpg'), sortOrder: 1, isThumbnail: false }),
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/b.jpg'), sortOrder: 2, isThumbnail: false }),
        ],
      }));
    });

    it('deduplicates repeated image URLs and reuses ingest results', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const ingestService = createIngestServiceMock();
      const service = createService(repository, commandService, ingestService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '대표이미지', '추가이미지'],
        ['SKU-1', '중복 이미지 상품', 10000, 'https://img.example.com/rep.jpg', 'https://img.example.com/rep.jpg\nhttps://img.example.com/a.jpg'],
      ]);

      await service.commit(createFile(buffer));

      expect(ingestService.ingest).toHaveBeenCalledTimes(2);
      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
        images: [
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/rep.jpg'), isThumbnail: true }),
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/a.jpg'), isThumbnail: false }),
        ],
      }));
    });

    it('extracts detail images from 상세설명 HTML img tags', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const html = '<div><img src="https://img.example.com/d1.jpg"><p>설명</p><img alt="x" src=\'https://img.example.com/d2.jpg\' /></div>';
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '상세설명'],
        ['SKU-1', '상세 상품', 10000, html],
      ]);

      await service.commit(createFile(buffer));

      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
        detailImages: [
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/d1.jpg'), sortOrder: 0 }),
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/d2.jpg'), sortOrder: 1 }),
        ],
      }));
    });

    it('parses multi-delimiter URLs from a custom 상세이미지 column', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '상세이미지 URL'],
        ['SKU-1', '상세 컬럼 상품', 10000, 'https://img.example.com/d1.jpg\nhttps://img.example.com/d2.jpg;https://img.example.com/d3.jpg|https://img.example.com/d4.jpg'],
      ]);

      const result = await service.commit(createFile(buffer));

      expect(result.rows[0].detailImageCount).toBe(4);
      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({
        detailImages: [
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/d1.jpg'), sortOrder: 0 }),
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/d2.jpg'), sortOrder: 1 }),
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/d3.jpg'), sortOrder: 2 }),
          expect.objectContaining({ url: ingestedUrl('https://img.example.com/d4.jpg'), sortOrder: 3 }),
        ],
      }));
    });

    it('reports invalid image URLs during preview without downloading', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const ingestService = createIngestServiceMock();
      const service = createService(repository, commandService, ingestService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '대표이미지'],
        ['SKU-1', '잘못된 이미지 상품', 10000, 'ftp://img.example.com/rep.jpg'],
      ]);

      const result = await service.preview(createFile(buffer));

      expect(result.rows[0].action).toBe('skip');
      expect(result.rows[0].errors.join(' ')).toContain('ftp://img.example.com/rep.jpg');
      expect(ingestService.ingest).not.toHaveBeenCalled();
    });

    it('marks the row failed with the failing URL when ingest fails and keeps processing other rows', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const ingestService = createIngestServiceMock();
      ingestService.ingest.mockImplementation(async (url: string) => {
        if (url.includes('broken')) {
          throw new BadRequestException(`이미지 다운로드에 실패했습니다. (HTTP 404): ${url}`);
        }
        return { url: ingestedUrl(url), filename: 'uploaded.jpg' };
      });
      const service = createService(repository, commandService, ingestService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '대표이미지'],
        ['SKU-1', '실패 상품', 10000, 'https://img.example.com/broken.jpg'],
        ['SKU-2', '정상 상품', 10000, 'https://img.example.com/ok.jpg'],
      ]);

      const result = await service.commit(createFile(buffer));

      expect(result.summary).toMatchObject({ successCount: 1, failureCount: 1 });
      expect(result.rows[0].status).toBe('failed');
      expect(result.rows[0].errors.join(' ')).toContain('broken.jpg');
      expect(commandService.create).toHaveBeenCalledTimes(1);
      expect(commandService.create).toHaveBeenCalledWith(expect.objectContaining({ sku: 'SKU-2' }));
    });

    it('includes gallery and detail image counts in preview rows', async () => {
      const repository = createRepositoryMock([]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '대표이미지', '추가이미지', '상세이미지 URL'],
        ['SKU-1', '카운트 상품', 10000, 'https://img.example.com/rep.jpg', 'https://img.example.com/a.jpg,https://img.example.com/b.jpg', 'https://img.example.com/d1.jpg'],
      ]);

      const result = await service.preview(createFile(buffer));

      expect(result.rows[0]).toMatchObject({
        galleryImageCount: 3,
        detailImageCount: 1,
        optionCount: 0,
      });
    });

    it('syncs options and images when updating an existing SKU', async () => {
      const existing = { id: 7, sku: 'SKU-2', slug: 'old-product' } as Product;
      const repository = createRepositoryMock([existing]);
      const commandService = createCommandServiceMock();
      const service = createService(repository, commandService);
      const buffer = await createWorkbookBuffer([
        ['판매자상품코드', '상품명', '판매가', '옵션형태', '옵션명', '옵션값', '대표이미지'],
        ['SKU-2', '기존 상품 갱신', 9000, '단독형', '용량', '100cc', 'https://img.example.com/rep.jpg'],
      ]);

      await service.commit(createFile(buffer));

      expect(commandService.update).toHaveBeenCalledWith(7, expect.objectContaining({
        options: [expect.objectContaining({ name: '용량', value: '100cc' })],
        images: [expect.objectContaining({ url: ingestedUrl('https://img.example.com/rep.jpg'), isThumbnail: true })],
      }));
    });
  });
});
