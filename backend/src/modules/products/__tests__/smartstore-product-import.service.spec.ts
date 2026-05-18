import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';
import { ProductStatus, Product } from '../entities/product.entity';
import { SmartStoreProductImportService } from '../smartstore-product-import.service';
import { ProductCommandService } from '../product-command.service';

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
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );
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
  });

  it('commits valid rows and maps SmartStore fields to product DTOs', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );
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
      images: [expect.objectContaining({ url: 'https://cdn.example.com/1.jpg', isThumbnail: true })],
    }));
  });

  it('updates existing products without changing slug or clearing omitted optional fields', async () => {
    const existing = { id: 7, sku: 'SKU-2', slug: 'old-product' } as Product;
    const repository = createRepositoryMock([existing]);
    const commandService = createCommandServiceMock();
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );
    const buffer = await createWorkbookBuffer([
      ['판매자상품코드', '상품명', '판매가', '재고수량'],
      ['SKU-2', '기존 상품', 9000, 2],
    ]);

    await service.commit(createFile(buffer));

    expect(commandService.update).toHaveBeenCalledWith(7, expect.not.objectContaining({
      slug: expect.any(String),
      description: undefined,
      salePrice: undefined,
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
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );
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
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );
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
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );
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
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );
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
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );

    await expect(service.preview(createFile(Buffer.from('x'), {
      originalname: 'products.csv',
      mimetype: 'text/csv',
    }))).rejects.toThrow(BadRequestException);
  });

  it('skips rows with missing required values or duplicate identifiers', async () => {
    const repository = createRepositoryMock([]);
    const commandService = createCommandServiceMock();
    const service = new SmartStoreProductImportService(
      repository as never,
      commandService as unknown as ProductCommandService,
    );
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
});
