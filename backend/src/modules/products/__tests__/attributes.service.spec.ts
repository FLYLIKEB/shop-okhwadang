import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { AttributesService } from '../attributes.service';
import { AttributeInputType, AttributeType } from '../entities/attribute-type.entity';
import { ProductAttribute } from '../entities/product-attribute.entity';

type RepoMock<T extends ObjectLiteral> = jest.Mocked<
  Pick<Repository<T>, 'find' | 'findOne' | 'create' | 'save' | 'remove' | 'update' | 'delete' | 'createQueryBuilder'>
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

  beforeEach(async () => {
    typeRepo = createRepoMock<AttributeType>();
    attrRepo = createRepoMock<ProductAttribute>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributesService,
        { provide: getRepositoryToken(AttributeType), useValue: typeRepo },
        { provide: getRepositoryToken(ProductAttribute), useValue: attrRepo },
      ],
    }).compile();

    service = module.get(AttributesService);
  });

  describe('createAttributeType', () => {
    it('기본값을 채워서 저장한다', async () => {
      typeRepo.findOne.mockResolvedValue(null as unknown as AttributeType);
      const created = { id: 1, code: 'clay', name: '니료', inputType: AttributeInputType.TEXT } as unknown as AttributeType;
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

      await expect(
        service.createAttributeType({ code: 'clay', name: '니료' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateAttributeType', () => {
    it('없는 ID 수정 시 NotFoundException', async () => {
      typeRepo.findOne.mockResolvedValue(null as unknown as AttributeType);

      await expect(service.updateAttributeType(999, { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('code 변경 시 다른 동일 code 가 있으면 ConflictException', async () => {
      typeRepo.findOne
        .mockResolvedValueOnce({ id: 1, code: 'old', name: 'a' } as AttributeType) // findAttributeTypeById
        .mockResolvedValueOnce({ id: 2, code: 'new' } as AttributeType); // 충돌 검사

      await expect(service.updateAttributeType(1, { code: 'new' })).rejects.toThrow(ConflictException);
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
        getMany: jest.fn().mockResolvedValue([
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
      const existing = { id: 1, productId: 1, attributeTypeId: 1, value: 'old', sortOrder: 0 } as ProductAttribute;
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

      await expect(
        service.updateProductAttribute(999, { value: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setProductAttributes', () => {
    it('기존 attributes 삭제 후 신규 일괄 저장', async () => {
      attrRepo.delete.mockResolvedValue({ affected: 0 } as unknown as Awaited<ReturnType<Repository<ProductAttribute>['delete']>>);
      attrRepo.create.mockImplementation((dto: unknown) => dto as ProductAttribute);
      (attrRepo.save as jest.Mock).mockImplementation(async (entities: unknown) => entities as ProductAttribute[]);

      const result = await service.setProductAttributes(10, [
        { attributeTypeId: 1, value: 'a' },
        { attributeTypeId: 2, value: 'b', displayValue: 'B' },
      ]);

      expect(attrRepo.delete).toHaveBeenCalledWith({ productId: 10 });
      expect(result).toHaveLength(2);
    });

    it('빈 배열이면 삭제만 수행하고 빈 배열 반환', async () => {
      attrRepo.delete.mockResolvedValue({ affected: 0 } as unknown as Awaited<ReturnType<Repository<ProductAttribute>['delete']>>);

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

    it('validValues 가 있으면 그것을 반환한다', async () => {
      typeRepo.findOne.mockResolvedValue({
        id: 1,
        code: 'clay',
        validValues: ['zhuni', 'duanni'],
      } as unknown as AttributeType);

      const result = await service.getAttributeValuesByTypeCode('clay');

      expect(result).toEqual(['zhuni', 'duanni']);
      expect(attrRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('validValues 가 없으면 product_attributes 에서 distinct 조회', async () => {
      typeRepo.findOne.mockResolvedValue({
        id: 1,
        code: 'clay',
        validValues: null,
      } as unknown as AttributeType);

      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([{ value: 'a' }, { value: 'b' }]),
      });
      attrRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAttributeValuesByTypeCode('clay');

      expect(result).toEqual(['a', 'b']);
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
