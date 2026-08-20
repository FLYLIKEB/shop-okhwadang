import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { SmartStoreReviewImportService } from '../smartstore-review-import.service';
import { Product } from '../../products/entities/product.entity';
import { ExternalReview } from '../entities/external-review.entity';
import { RemoteImageIngestService } from '../../upload/remote-image-ingest.service';
import { NAVER_SMARTSTORE_REVIEW_SOURCE } from '../../../common/imports/external-source.util';
import { ReviewStatsSyncService } from '../review-stats-sync.service';

function makeFile(buffer: Buffer): Express.Multer.File {
  return {
    originalname: 'review.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

async function makeWorkbook(rows: Array<Array<string | number>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('reviews');
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const header = [
  '상품번호',
  '상품명',
  '리뷰구분',
  '구매자평점',
  '포토/영상',
  '리뷰상세내용',
  '리뷰도움수',
  '등록자',
  '리뷰등록일',
  '최종수정일',
  '리뷰글번호',
  '관련리뷰글번호',
  '관련리뷰상세내용',
  '전시상태',
  '답글여부',
  '답글등록일시',
  '베스트리뷰',
  '베스트리뷰선정일시',
  '이벤트번호',
  '혜택지급',
  '혜택지급일시',
  '유저정보 등록 항목',
  '상품주문번호',
  '풀필먼트사',
  '리뷰이동일',
];

describe('SmartStoreReviewImportService', () => {
  let service: SmartStoreReviewImportService;

  const productRepository = {
    find: jest.fn(),
    manager: { query: jest.fn() },
  };
  const externalReviewRepository = {
    find: jest.fn(),
    create: jest.fn((value: Partial<ExternalReview>) => value),
    save: jest.fn(async (value: Partial<ExternalReview>) => ({ id: 10, ...value })),
  };
  const remoteImageIngestService = {
    ingest: jest.fn(),
  };
  const mockReviewStatsSyncService = {
    syncProductStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartStoreReviewImportService,
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(ExternalReview), useValue: externalReviewRepository },
        { provide: RemoteImageIngestService, useValue: remoteImageIngestService },
        { provide: ReviewStatsSyncService, useValue: mockReviewStatsSyncService },
      ],
    }).compile();

    service = module.get(SmartStoreReviewImportService);
    jest.clearAllMocks();
    productRepository.find.mockResolvedValue([
      { id: 7, sku: 'naver-13629303355', name: '옥화당 자사호' },
    ]);
    externalReviewRepository.find.mockResolvedValue([]);
    remoteImageIngestService.ingest.mockResolvedValue({
      url: 'https://cdn.example.com/reviews/naver.jpg',
      filename: 'reviews/naver.jpg',
    });
    productRepository.manager.query.mockResolvedValue(undefined);
    mockReviewStatsSyncService.syncProductStats.mockResolvedValue(undefined);
  });

  it('previews SmartStore review rows and matches products by naver-prefixed SKU', async () => {
    const file = makeFile(
      await makeWorkbook([
        header,
        [
          '13629303355',
          '옥화당 자사호',
          '일반',
          5,
          'https://phinf.pstatic.net/review.jpg',
          '&quot;좋아요&quot; &hellip;',
          3,
          'da**',
          '2026.06.27. 16:37:03',
          '',
          '5008298806',
          '',
          '',
          '정상',
          'N',
          '',
          'Y',
          '2026.06.28',
          '',
          '',
          '',
          '',
          '2026062172779571',
          '',
          '',
        ],
      ]),
    );

    const result = await service.preview(file);

    expect(productRepository.find).toHaveBeenCalledWith({
      where: { sku: expect.objectContaining({ _value: ['naver-13629303355'] }) },
    });
    expect(result.rows[0]).toMatchObject({
      externalReviewId: '5008298806',
      externalProductKey: 'naver-13629303355',
      matchedProductId: 7,
      action: 'create',
      status: 'valid',
      rating: 5,
      mediaCount: 1,
      isVisible: true,
    });
    expect(remoteImageIngestService.ingest).not.toHaveBeenCalled();
  });

  it('commits rows with S3 media, upserts by review id, and preserves manual visibility on update', async () => {
    externalReviewRepository.find.mockResolvedValue([
      {
        id: 44,
        source: 'smartstore',
        externalReviewId: '5008298806',
        productId: 7,
        isVisible: false,
      },
    ]);
    const file = makeFile(
      await makeWorkbook([
        header,
        [
          '13629303355',
          '옥화당 자사호',
          '일반',
          5,
          'https://phinf.pstatic.net/review.jpg',
          '좋아요',
          1,
          'da**',
          '2026.06.27. 16:37:03',
          '',
          '5008298806',
          '',
          '',
          '정상',
          'N',
          '',
          'N',
          '',
          '',
          '',
          '',
          '',
          '2026062172779571',
          '',
          '',
        ],
      ]),
    );

    const result = await service.commit(file);

    expect(result.summary).toMatchObject({
      totalRows: 1,
      updateCount: 1,
      successCount: 1,
      mediaFailureCount: 0,
    });
    expect(externalReviewRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 44,
        source: NAVER_SMARTSTORE_REVIEW_SOURCE,
        productId: 7,
        externalReviewId: '5008298806',
        isVisible: false,
        imageUrls: ['https://cdn.example.com/reviews/naver.jpg'],
        mediaAssets: [
          expect.objectContaining({
            originalUrl: 'https://phinf.pstatic.net/review.jpg',
            status: 'uploaded',
          }),
        ],
      }),
    );
    expect(mockReviewStatsSyncService.syncProductStats).toHaveBeenCalledWith(
      7,
      productRepository.manager,
    );
  });

  it('reports row failures without aborting the whole upload', async () => {
    productRepository.find.mockResolvedValue([]);
    const file = makeFile(
      await makeWorkbook([
        header,
        [
          '999',
          '알 수 없는 상품',
          '일반',
          5,
          '',
          '좋아요',
          '',
          'da**',
          '2026.06.27. 16:37:03',
          '',
          '5008298806',
        ],
        [
          '13629303355',
          '옥화당 자사호',
          '일반',
          5,
          '',
          '좋아요',
          '',
          'da**',
          '2026.06.27. 16:37:03',
          '',
          '',
        ],
      ]),
    );

    const result = await service.preview(file);

    expect(result.summary.failureCount).toBe(2);
    expect(result.summary.unmatchedProductCount).toBe(2);
    expect(result.rows[0].errors.join(' ')).toContain('상품번호와 연결된 상품을 찾을 수 없습니다');
    expect(result.rows[1].errors.join(' ')).toContain('리뷰글번호가 필요합니다');
  });
});
