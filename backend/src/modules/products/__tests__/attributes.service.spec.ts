import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { AttributesService } from '../attributes.service';
import { AttributeInputType, AttributeType } from '../entities/attribute-type.entity';
import { ProductAttribute } from '../entities/product-attribute.entity';
import { Product } from '../entities/product.entity';
import { AttributeValueOptionEntity } from '../entities/attribute-value-option.entity';

type RepoMock<T extends ObjectLiteral> = jest.Mocked<
  Pick<
    Repository<T>,
    'find' | 'findOne' | 'create' | 'save' | 'remove' | 'update' | 'delete' | 'createQueryBuilder'
  >
>;

function createRepoMock<T extends ObjectLiteral>(): RepoMock<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as RepoMock<T>;
}

function createQueryBuilderMock(overrides: Record<string, unknown> = {}) {
  const qb: Record<string, jest.Mock> = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  Object.assign(qb, overrides);
  return qb as unknown as SelectQueryBuilder<ProductAttribute>;
}

describe('AttributesService', () => {
  let service: AttributesService;
  let typeRepo: RepoMock<AttributeType>;
  let attrRepo: RepoMock<ProductAttribute>;
  let optionRepo: RepoMock<AttributeValueOptionEntity>;
  let productRepo: RepoMock<Product>;

  beforeEach(async () => {
    typeRepo = createRepoMock<AttributeType>();
    attrRepo = createRepoMock<ProductAttribute>();
    optionRepo = createRepoMock<AttributeValueOptionEntity>();
    productRepo = createRepoMock<Product>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributesService,
        { provide: getRepositoryToken(AttributeType), useValue: typeRepo },
        { provide: getRepositoryToken(ProductAttribute), useValue: attrRepo },
        { provide: getRepositoryToken(AttributeValueOptionEntity), useValue: optionRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get(AttributesService);
    optionRepo.find.mockResolvedValue([]);
  });

  describe('createAttributeType', () => {
    it('기본값을 채워서 저장한다', async () => {
      typeRepo.findOne.mockResolvedValue(null as unknown as AttributeType);
      const created = {
        id: 1,
        code: 'clay',
        name: '니료',
        inputType: AttributeInputType.TEXT,
      } as unknown as AttributeType;
      typeRepo.create.mockReturnValue(created);
      typeRepo.save.mockResolvedValue(created);

      await service.createAttributeType({ code: 'clay', name: '니료' });

      expect(typeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'clay',
          name: '니료',
          inputType: AttributeInputType.TEXT,
          isFilterable: false,
          isSearchable: false,
          sortOrder: 0,
        }),
      );
    });

    it('동일 code 가 이미 존재하면 ConflictException', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 1, code: 'clay' } as AttributeType);

      await expect(service.createAttributeType({ code: 'clay', name: '니료' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateAttributeType', () => {
    it('없는 ID 수정 시 NotFoundException', async () => {
      typeRepo.findOne.mockResolvedValue(null as unknown as AttributeType);

      await expect(service.updateAttributeType(999, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('code 변경 시 다른 동일 code 가 있으면 ConflictException', async () => {
      typeRepo.findOne
        .mockResolvedValueOnce({ id: 1, code: 'old', name: 'a' } as AttributeType) // findAttributeTypeById
        .mockResolvedValueOnce({ id: 2, code: 'new' } as AttributeType); // 충돌 검사

      await expect(service.updateAttributeType(1, { code: 'new' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('동일 code 변경 시도는 충돌 검사 스킵', async () => {
      const existing = { id: 1, code: 'same', name: 'a' } as AttributeType;
      typeRepo.findOne.mockResolvedValue(existing);
      typeRepo.save.mockImplementation(async (entity: unknown) => entity as AttributeType);

      const result = await service.updateAttributeType(1, { code: 'same', name: 'b' });

      expect(result.name).toBe('b');
    });
  });

  describe('findAttributeTypeById', () => {
    it('없는 ID 조회 시 NotFoundException', async () => {
      typeRepo.findOne.mockResolvedValue(null as unknown as AttributeType);

      await expect(service.findAttributeTypeById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAttributesByProductIds', () => {
    it('빈 배열이면 빈 Map 반환', async () => {
      const result = await service.findAttributesByProductIds([]);

      expect(result.size).toBe(0);
      expect(attrRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('상품ID별로 그룹화한 Map을 반환한다', async () => {
      const qb = createQueryBuilderMock({
        getMany: jest
          .fn()
          .mockResolvedValue([
            { id: 1, productId: 10, attributeTypeId: 1, value: 'a' } as ProductAttribute,
            { id: 2, productId: 10, attributeTypeId: 2, value: 'b' } as ProductAttribute,
            { id: 3, productId: 11, attributeTypeId: 1, value: 'c' } as ProductAttribute,
          ]),
      });
      attrRepo.createQueryBuilder.mockReturnValue(qb);

      const map = await service.findAttributesByProductIds([10, 11]);

      expect(map.get(10)).toHaveLength(2);
      expect(map.get(11)).toHaveLength(1);
    });
  });

  describe('createOrUpdateProductAttribute', () => {
    it('기존 값이 있으면 update', async () => {
      const existing = {
        id: 1,
        productId: 1,
        attributeTypeId: 1,
        value: 'old',
        sortOrder: 0,
      } as ProductAttribute;
      attrRepo.findOne.mockResolvedValue(existing);
      attrRepo.save.mockImplementation(async (entity: unknown) => entity as ProductAttribute);

      const result = await service.createOrUpdateProductAttribute(1, 1, {
        productId: 1,
        attributeTypeId: 1,
        value: 'new',
      });

      expect(result.value).toBe('new');
    });

    it('기존 값이 없으면 create 호출', async () => {
      attrRepo.findOne.mockResolvedValue(null as unknown as ProductAttribute);
      const created = { id: 99 } as unknown as ProductAttribute;
      attrRepo.create.mockReturnValue(created);
      attrRepo.save.mockResolvedValue(created);

      await service.createOrUpdateProductAttribute(1, 1, {
        productId: 1,
        attributeTypeId: 1,
        value: 'new',
      });

      expect(attrRepo.create).toHaveBeenCalled();
    });
  });

  describe('updateProductAttribute', () => {
    it('없는 ID 수정 시 NotFoundException', async () => {
      attrRepo.findOne.mockResolvedValue(null as unknown as ProductAttribute);

      await expect(service.updateProductAttribute(999, { value: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setProductAttributes', () => {
    it('기존 attributes 삭제 후 신규 일괄 저장', async () => {
      attrRepo.delete.mockResolvedValue({ affected: 0 } as unknown as Awaited<
        ReturnType<Repository<ProductAttribute>['delete']>
      >);
      attrRepo.create.mockImplementation((dto: unknown) => dto as ProductAttribute);
      (attrRepo.save as jest.Mock).mockImplementation(
        async (entities: unknown) => entities as ProductAttribute[],
      );

      const result = await service.setProductAttributes(10, [
        { attributeTypeId: 1, value: 'a' },
        { attributeTypeId: 2, value: 'b', displayValue: 'B' },
      ]);

      expect(attrRepo.delete).toHaveBeenCalledWith({ productId: 10 });
      expect(result).toHaveLength(2);
    });

    it('빈 배열이면 삭제만 수행하고 빈 배열 반환', async () => {
      attrRepo.delete.mockResolvedValue({ affected: 0 } as unknown as Awaited<
        ReturnType<Repository<ProductAttribute>['delete']>
      >);

      const result = await service.setProductAttributes(10, []);

      expect(result).toEqual([]);
      expect(attrRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getAttributeValuesByTypeCode', () => {
    it('존재하지 않는 code 면 빈 배열', async () => {
      typeRepo.findOne.mockResolvedValue(null as unknown as AttributeType);

      const result = await service.getAttributeValuesByTypeCode('missing');

      expect(result).toEqual([]);
    });

    it('validValues 와 product_attributes 표시값을 병합해서 반환한다', async () => {
      typeRepo.findOne.mockResolvedValue({
        id: 1,
        code: 'clay',
        validValues: ['zhuni', 'duanni'],
      } as unknown as AttributeType);

      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([
          { value: 'duanni', displayValue: 'duanni' },
          { value: 'duanni', displayValue: '단니' },
          { value: 'hongni', displayValue: '홍니' },
        ]),
      });
      attrRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAttributeValuesByTypeCode('clay');

      expect(result).toEqual([
        { value: 'zhuni', displayValue: null },
        { value: 'duanni', displayValue: '단니' },
        { value: 'hongni', displayValue: '홍니' },
      ]);
    });



    it('필터 표준 속성값은 validValues 에만 있어도 한글 표시값을 보완한다', async () => {
      typeRepo.findOne.mockResolvedValue({
        id: 1,
        code: 'clay_type',
        validValues: ['nokni', 'dicaoqing', 'hongni'],
      } as unknown as AttributeType);

      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([]),
      });
      attrRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAttributeValuesByTypeCode('clay_type');

      expect(result).toEqual([
        { value: 'nokni', displayValue: '녹니' },
        { value: 'dicaoqing', displayValue: '저조청' },
        { value: 'hongni', displayValue: '홍니' },
      ]);
    });

    it('validValues 가 없으면 product_attributes 에서 value/displayValue 를 조회한다', async () => {
      typeRepo.findOne.mockResolvedValue({
        id: 1,
        code: 'clay',
        validValues: null,
      } as unknown as AttributeType);

      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([
          { value: 'a', displayValue: '에이' },
          { value: 'b', displayValue: null },
        ]),
      });
      attrRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAttributeValuesByTypeCode('clay');

      expect(result).toEqual([
        { value: 'a', displayValue: '에이' },
        { value: 'b', displayValue: null },
      ]);
    });
  });


  describe('attribute value option management', () => {
    const clayType = { id: 1, code: 'clay_type', validValues: ['nokni'] } as unknown as AttributeType;

    it('속성값 표시 이름 수정 시 옵션을 만들고 연결 상품 표시값도 갱신한다', async () => {
      typeRepo.findOne.mockResolvedValue(clayType);
      optionRepo.findOne.mockResolvedValue(null as unknown as AttributeValueOptionEntity);
      optionRepo.create.mockImplementation((dto: unknown) => dto as AttributeValueOptionEntity);
      optionRepo.save.mockImplementation(async (entity: unknown) => ({ ...(entity as AttributeValueOptionEntity), id: 7 }));
      optionRepo.find.mockResolvedValue([
        { id: 7, attributeTypeId: 1, value: 'nokni', displayValue: '녹니 수정', sortOrder: 0, isActive: true } as AttributeValueOptionEntity,
      ]);
      attrRepo.createQueryBuilder.mockReturnValueOnce(createQueryBuilderMock({ getRawMany: jest.fn().mockResolvedValue([]) }));
      attrRepo.createQueryBuilder.mockReturnValueOnce(createQueryBuilderMock({ getRawMany: jest.fn().mockResolvedValue([]) }));
      attrRepo.update.mockResolvedValue({ affected: 2 } as unknown as Awaited<ReturnType<Repository<ProductAttribute>['update']>>);

      const result = await service.updateAttributeValueOption('clay_type', 'nokni', { displayValue: '녹니 수정' });

      expect(optionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ value: 'nokni', displayValue: '녹니 수정' }));
      expect(attrRepo.update).toHaveBeenCalledWith({ attributeTypeId: 1, value: 'nokni' }, { displayValue: '녹니 수정' });
      expect(result.displayValue).toBe('녹니 수정');
    });

    it('상품을 속성값에 연결하면 기존 상품 속성값을 해당 설정으로 교체한다', async () => {
      typeRepo.findOne.mockResolvedValue(clayType);
      productRepo.findOne.mockResolvedValue({ id: 10, name: '상품', slug: 'p' } as Product);
      optionRepo.findOne.mockResolvedValue({
        id: 7, attributeTypeId: 1, value: 'nokni', displayValue: '녹니', sortOrder: 0, isActive: true,
      } as AttributeValueOptionEntity);
      optionRepo.save.mockImplementation(async (entity: unknown) => entity as AttributeValueOptionEntity);
      attrRepo.findOne.mockResolvedValue({ productId: 10, attributeTypeId: 1, value: 'old' } as ProductAttribute);
      attrRepo.save.mockImplementation(async (entity: unknown) => entity as ProductAttribute);
      optionRepo.find.mockResolvedValue([
        { id: 7, attributeTypeId: 1, value: 'nokni', displayValue: '녹니', sortOrder: 0, isActive: true } as AttributeValueOptionEntity,
      ]);
      attrRepo.createQueryBuilder.mockReturnValueOnce(createQueryBuilderMock({ getRawMany: jest.fn().mockResolvedValue([]) }));
      attrRepo.createQueryBuilder.mockReturnValueOnce(createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([{ value: 'nokni', id: '10', name: '상품', slug: 'p' }]),
      }));

      const result = await service.linkProductToAttributeValue('clay_type', 'nokni', { productId: 10 });

      expect(attrRepo.save).toHaveBeenCalledWith(expect.objectContaining({ value: 'nokni', displayValue: '녹니' }));
      expect(result.products).toEqual([{ id: 10, name: '상품', slug: 'p' }]);
    });
  });

  describe('getFilterableAttributes', () => {
    it('isFilterable && isActive 만 sortOrder 순으로 조회한다', async () => {
      typeRepo.find.mockResolvedValue([]);

      await service.getFilterableAttributes();

      expect(typeRepo.find).toHaveBeenCalledWith({
        where: { isFilterable: true, isActive: true },
        order: { sortOrder: 'ASC' },
      });
    });
  });
});
