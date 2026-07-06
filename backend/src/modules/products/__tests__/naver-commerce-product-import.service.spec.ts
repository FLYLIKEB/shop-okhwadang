import { Product } from '../entities/product.entity';
import { NaverCommerceApiClient, NaverCommerceFetchedProduct } from '../naver-commerce-api.client';
import { NaverCommerceProductImportService } from '../naver-commerce-product-import.service';
import { ProductCommandService } from '../product-command.service';
import { SmartStoreProductImportService } from '../smartstore-product-import.service';
import { RemoteImageIngestService } from '../../upload/remote-image-ingest.service';
import { ProductKeywordMappingService } from '../product-keyword-mapping.service';
import { AttributesService } from '../attributes.service';

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

function createCategoryRepositoryMock() {
  return {
    find: jest.fn().mockResolvedValue([{ id: 1, slug: 'teapot', name: '자사호', isActive: true }]),
  };
}

function createAttributeTypeRepositoryMock() {
  return {
    find: jest.fn().mockResolvedValue([
      { id: 10, code: 'clay_type', isActive: true },
      { id: 11, code: 'teapot_shape', isActive: true },
      { id: 12, code: 'capacity', isActive: true },
      { id: 14, code: 'clay_origin', isActive: true },
    ]),
  };
}

function createAttributesServiceMock() {
  return {
    setProductAttributes: jest.fn().mockResolvedValue([]),
    createOrUpdateProductAttribute: jest.fn().mockResolvedValue({}),
  };
}

function createService(
  fetchedProducts: NaverCommerceFetchedProduct[],
  existingProducts: Product[] = [],
) {
  const naverClient = {
    fetchProductsWithDetails: jest.fn().mockResolvedValue(fetchedProducts),
  };
  const repository = createRepositoryMock(existingProducts);
  const commandService = createCommandServiceMock();
  const ingestService = createIngestServiceMock();
  const attributesService = createAttributesServiceMock();
  const smartStoreImportService = new SmartStoreProductImportService(
    repository as never,
    createCategoryRepositoryMock() as never,
    createAttributeTypeRepositoryMock() as never,
    commandService as unknown as ProductCommandService,
    ingestService as unknown as RemoteImageIngestService,
    new ProductKeywordMappingService(),
    attributesService as unknown as AttributesService,
  );
  return {
    service: new NaverCommerceProductImportService(
      naverClient as unknown as NaverCommerceApiClient,
      smartStoreImportService,
    ),
    naverClient,
    repository,
    commandService,
    ingestService,
    attributesService,
  };
}

const NAVER_PRODUCTS: NaverCommerceFetchedProduct[] = [
  {
    rowNumber: 1,
    listProduct: { originProductNo: 1001, channelProducts: [{ sellerManagementCode: 'SKU-1' }] },
    detailProduct: {
      originProduct: {
        name: '옥화당 자사호 황룡산 노단니 연자호 110cc',
        salePrice: 50000,
        stockQuantity: 0,
        statusType: 'SALE',
        detailContent: '<p>상세</p>',
        images: {
          representativeImage: { url: 'https://img.example.com/rep.jpg' },
          optionalImages: [{ url: 'https://img.example.com/a.jpg' }],
        },
        deliveryInfo: { deliveryFee: { deliveryFeeType: 'FREE', baseFee: 0 } },
        detailAttribute: {
          manufacturerName: '옥화당',
          originAreaInfo: { content: '중국' },
          afterServiceInfo: {
            afterServiceTelephoneNumber: '010-0000-0000',
            afterServiceGuideContent: '품질 보증 안내',
          },
        },
        optionInfo: {
          optionCombinations: [
            { optionName: '용량', optionValue: '100cc', price: 0, stockQuantity: 2, usable: 'Y' },
          ],
        },
      },
    },
  },
  {
    rowNumber: 2,
    listProduct: { originProductNo: 1002, channelProducts: [{ sellerManagementCode: 'SKU-2' }] },
    detailProduct: {
      originProduct: {
        name: '미매칭 상품',
        salePrice: 30000,
        stockQuantity: 1,
        statusType: 'SALE',
      },
    },
  },
];

describe('NaverCommerceProductImportService', () => {
  it('previews Naver Commerce products with the shared SmartStore row format without saving', async () => {
    const existing = { id: 7, sku: 'SKU-1', slug: 'old-product' } as Product;
    const { service, commandService } = createService(NAVER_PRODUCTS, [existing]);

    const result = await service.preview();

    expect(result.summary).toMatchObject({
      totalRows: 2,
      createCount: 0,
      updateCount: 1,
      skipCount: 1,
      failureCount: 0,
    });
    expect(result.rows[0]).toMatchObject({
      identifier: 'SKU-1',
      action: 'update',
      productId: 7,
      optionCount: 0,
      stock: 2,
      stockSource: 'single_option_collapsed',
      galleryImageCount: 2,
      isFreeShipping: true,
      hasNoticeInfo: true,
      automaticMapping: expect.objectContaining({
        category: expect.objectContaining({ slug: 'teapot', categoryId: 1 }),
        attributes: expect.arrayContaining([
          expect.objectContaining({ code: 'clay_type', value: 'old_duanni', attributeTypeId: 10 }),
          expect.objectContaining({ code: 'teapot_shape', value: 'lianzi', attributeTypeId: 11 }),
        ]),
      }),
    });
    expect(result.rows[1]).toMatchObject({ identifier: 'SKU-2', action: 'skip', status: 'valid' });
    expect(result.rows[1].errors.join(' ')).toContain('업데이트 대상에서 제외');
    expect(commandService.update).not.toHaveBeenCalled();
    expect(commandService.create).not.toHaveBeenCalled();
  });

  it('commits only SKU-matched Naver products and never creates unmatched API rows', async () => {
    const existing = { id: 7, sku: 'SKU-1', slug: 'old-product' } as Product;
    const { service, commandService, ingestService, attributesService } = createService(
      NAVER_PRODUCTS,
      [existing],
    );

    const result = await service.commit();

    expect(result.summary).toMatchObject({
      updateCount: 1,
      createCount: 0,
      skipCount: 1,
      successCount: 1,
      failureCount: 0,
    });
    expect(commandService.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        name: '옥화당 자사호 황룡산 노단니 연자호 110cc',
        sku: 'SKU-1',
        price: 50000,
        stock: 2,
        isFreeShipping: true,
        isVisibleKo: true,
        isVisibleEn: false,
        description: '<p>상세</p>',
        noticeInfo: expect.objectContaining({ manufacturer: '옥화당', countryOfOrigin: '중국' }),
        // 단일 원본 옵션은 상품 재고로 흡수되고, 상품명 기반 옵션도 다시 생성하지 않는다.
        // 빈 배열을 전달해 기존 0재고 옵션까지 제거한다. (issue #1052, regression of #1036)
        options: [],
        images: [
          expect.objectContaining({
            url: expect.stringContaining(encodeURIComponent('https://img.example.com/rep.jpg')),
            isThumbnail: true,
          }),
          expect.objectContaining({
            url: expect.stringContaining(encodeURIComponent('https://img.example.com/a.jpg')),
            isThumbnail: false,
          }),
        ],
      }),
    );
    expect(commandService.create).not.toHaveBeenCalled();
    expect(attributesService.createOrUpdateProductAttribute).toHaveBeenCalledWith(
      7,
      10,
      expect.objectContaining({ value: 'old_duanni', displayValue: '노단니' }),
    );
    expect(attributesService.createOrUpdateProductAttribute).toHaveBeenCalledWith(
      7,
      11,
      expect.objectContaining({ value: 'lianzi', displayValue: '연자호' }),
    );
    expect(attributesService.createOrUpdateProductAttribute).toHaveBeenCalledWith(
      7,
      12,
      expect.objectContaining({ value: '110cc', displayValue: '110cc' }),
    );
    expect(ingestService.ingest).toHaveBeenCalledTimes(2);
  });

  it('maps Naver Commerce detailAttribute option combinations and derives product stock when stockQuantity is omitted', async () => {
    const existing = { id: 8, sku: 'SKU-OPTION', slug: 'option-product' } as Product;
    const fetchedProducts: NaverCommerceFetchedProduct[] = [
      {
        rowNumber: 1,
        listProduct: { originProductNo: 2001, channelProducts: [{ sellerManagementCode: 'SKU-OPTION' }] },
        detailProduct: {
          originProduct: {
            name: '옵션 재고 상품',
            salePrice: 10000,
            statusType: 'SALE',
            detailAttribute: {
              optionInfo: {
                optionCombinationGroupNames: {
                  optionGroupName1: '색상',
                  optionGroupName2: '용량',
                },
                optionCombinations: [
                  { optionName1: '홍니', optionName2: '100cc', stockQuantity: 4, price: 0, usable: true },
                  { optionName1: '자니', optionName2: '120cc', stockQuantity: 6, price: 2000, usable: true },
                  { optionName1: '흑니', optionName2: '150cc', stockQuantity: 9, price: 3000, isUsable: false },
                ],
              },
            },
          },
        },
      },
    ];
    const { service, commandService } = createService(fetchedProducts, [existing]);

    const result = await service.commit();

    expect(result.rows[0]).toMatchObject({
      stock: 10,
      optionStockTotal: 10,
      stockSource: 'option_stock_total',
      optionCount: 2,
    });
    expect(commandService.update).toHaveBeenCalledWith(
      8,
      expect.objectContaining({
        stock: 10,
        status: 'active',
        options: [
          expect.objectContaining({ name: '색상/용량', value: '홍니/100cc', stock: 4 }),
          expect.objectContaining({ name: '색상/용량', value: '자니/120cc', stock: 6, priceAdjustment: 2000 }),
        ],
      }),
    );
  });

  it('uses the SmartStore channel product number as the fallback SKU-compatible identifier', async () => {
    const existing = { id: 8, sku: 'naver-2001', slug: 'old-channel-product' } as Product;
    const fetchedProducts: NaverCommerceFetchedProduct[] = [
      {
        rowNumber: 1,
        listProduct: { originProductNo: 1001, channelProducts: [{ channelProductNo: 2001 }] },
        detailProduct: {
          originProduct: {
            name: '채널번호 상품',
            salePrice: 12000,
            stockQuantity: 1,
            statusType: 'SALE',
          },
        },
      },
    ];
    const { service, commandService } = createService(fetchedProducts, [existing]);

    const result = await service.commit();

    expect(result.rows[0]).toMatchObject({
      identifier: 'naver-2001',
      action: 'update',
      productId: 8,
    });
    expect(commandService.update).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ sku: 'naver-2001' }),
    );
    expect(commandService.create).not.toHaveBeenCalled();
  });

  it('uses seller management code from Naver origin detail attributes so keyword attributes apply to matched products', async () => {
    const existing = {
      id: 9,
      sku: 'SELLER-DETAIL-1',
      slug: 'detail-seller-code-product',
    } as Product;
    const fetchedProducts: NaverCommerceFetchedProduct[] = [
      {
        rowNumber: 1,
        listProduct: { originProductNo: 3001 },
        detailProduct: {
          originProduct: {
            name: '옥화당 자사호 노단니 연자호 120cc',
            salePrice: 88000,
            stockQuantity: 2,
            detailAttribute: {
              sellerCodeInfo: { sellerManagementCode: 'SELLER-DETAIL-1' },
            },
          },
        },
      },
    ];
    const { service, commandService, attributesService } = createService(fetchedProducts, [
      existing,
    ]);

    const result = await service.commit();

    expect(result.rows[0]).toMatchObject({
      identifier: 'SELLER-DETAIL-1',
      action: 'update',
      productId: 9,
      status: 'success',
    });
    expect(commandService.update).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ sku: 'SELLER-DETAIL-1' }),
    );
    expect(attributesService.createOrUpdateProductAttribute).toHaveBeenCalledWith(
      9,
      10,
      expect.objectContaining({ value: 'old_duanni', displayValue: '노단니' }),
    );
    expect(attributesService.createOrUpdateProductAttribute).toHaveBeenCalledWith(
      9,
      11,
      expect.objectContaining({ value: 'lianzi', displayValue: '연자호' }),
    );
  });

  it('marks product detail failures as row-level failures while keeping other rows processable', async () => {
    const existing = { id: 7, sku: 'SKU-1', slug: 'old-product' } as Product;
    const failingProducts: NaverCommerceFetchedProduct[] = [
      NAVER_PRODUCTS[0],
      {
        rowNumber: 2,
        listProduct: {
          originProductNo: 1003,
          channelProducts: [{ sellerManagementCode: 'SKU-3' }],
        },
        detailProduct: null,
        error: '네이버 상품 상세 조회에 실패했습니다.',
      },
    ];
    const { service, commandService } = createService(failingProducts, [existing]);

    const result = await service.commit();

    expect(result.summary).toMatchObject({ successCount: 1, failureCount: 1 });
    expect(result.rows[1]).toMatchObject({ action: 'skip', status: 'failed' });
    expect(result.rows[1].errors.join(' ')).toContain('상세 조회에 실패');
    expect(commandService.update).toHaveBeenCalledTimes(1);
  });
});
