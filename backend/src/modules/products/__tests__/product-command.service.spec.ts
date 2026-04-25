import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ProductCommandService } from '../product-command.service';
import { Product } from '../entities/product.entity';
import { CacheService } from '../../cache/cache.service';
import { RestockAlertsService } from '../../restock-alerts/restock-alerts.service';

type RepoMock<T extends ObjectLiteral> = jest.Mocked<
  Pick<Repository<T>, 'find' | 'findOne' | 'create' | 'save' | 'remove'>
>;

function createRepoMock<T extends ObjectLiteral>(): RepoMock<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  } as unknown as RepoMock<T>;
}

interface ManagerMock {
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
}

describe('ProductCommandService', () => {
  let service: ProductCommandService;
  let productRepo: RepoMock<Product>;
  let cacheService: { del: jest.Mock; delPattern: jest.Mock };
  let restockAlerts: { processProductRestock: jest.Mock };
  let manager: ManagerMock;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    productRepo = createRepoMock<Product>();
    cacheService = {
      del: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };
    restockAlerts = {
      processProductRestock: jest.fn().mockResolvedValue(undefined),
    };
    manager = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (m: ManagerMock) => Promise<unknown>) => cb(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCommandService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: CacheService, useValue: cacheService },
        { provide: RestockAlertsService, useValue: restockAlerts },
      ],
    }).compile();

    service = module.get(ProductCommandService);
  });

  describe('create', () => {
    it('정상 생성 후 Product 반환', async () => {
      const created = { id: 1, name: '신상품', stock: 5 } as Product;
      manager.create.mockReturnValue(created);
      manager.save.mockResolvedValue(created);

      const result = await service.create({
        name: '신상품',
        slug: 'new',
        price: 1000,
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('categoryId/salePrice/sku 미지정 시 null 로 저장', async () => {
      const created = { id: 1 } as Product;
      manager.create.mockReturnValue(created);
      manager.save.mockResolvedValue(created);

      await service.create({ name: 'p', slug: 'p1', price: 100 });

      expect(manager.create).toHaveBeenCalledWith(
        Product,
        expect.objectContaining({
          categoryId: null,
          salePrice: null,
          sku: null,
        }),
      );
    });

    it('이미지 함께 생성하면 ProductImage 도 저장', async () => {
      const created = { id: 5 } as Product;
      manager.create.mockReturnValue(created);
      manager.save.mockResolvedValue(created);

      await service.create({
        name: 'p',
        slug: 'p2',
        price: 100,
        images: [
          { url: 'a.jpg' },
          { url: 'b.jpg' },
        ],
      });

      expect(manager.save).toHaveBeenCalledTimes(2); // product + images batch
    });

    it('ER_DUP_ENTRY 에러는 ConflictException 으로 변환', async () => {
      const dupErr = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
      manager.create.mockReturnValue({ id: 1 } as Product);
      manager.save.mockRejectedValue(dupErr);

      await expect(
        service.create({ name: 'p', slug: 'dup', price: 100 }),
      ).rejects.toThrow(ConflictException);
    });

    it('일반 에러는 그대로 전파', async () => {
      manager.create.mockReturnValue({ id: 1 } as Product);
      manager.save.mockRejectedValue(new Error('DB down'));

      await expect(
        service.create({ name: 'p', slug: 'p3', price: 100 }),
      ).rejects.toThrow('DB down');
    });
  });

  describe('update', () => {
    it('없는 ID 수정 시 NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null as unknown as Product);

      await expect(service.update(999, { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('정상 수정 시 캐시 무효화 호출', async () => {
      const existing = { id: 1, name: 'old', stock: 5 } as Product;
      productRepo.findOne.mockResolvedValue(existing);
      manager.save.mockResolvedValue({ ...existing, name: 'new' } as Product);

      await service.update(1, { name: 'new' });

      expect(cacheService.del).toHaveBeenCalled();
      expect(cacheService.delPattern).toHaveBeenCalled();
    });

    it('stock 변경 시 RestockAlertsService.processProductRestock 호출', async () => {
      const existing = { id: 1, stock: 0 } as Product;
      productRepo.findOne.mockResolvedValue(existing);
      manager.save.mockResolvedValue({ id: 1, stock: 10 } as Product);

      await service.update(1, { stock: 10 });

      expect(restockAlerts.processProductRestock).toHaveBeenCalledWith(1, 0, 10);
    });

    it('stock 변경이 없으면 processProductRestock 미호출', async () => {
      const existing = { id: 1, stock: 5 } as Product;
      productRepo.findOne.mockResolvedValue(existing);
      manager.save.mockResolvedValue(existing);

      await service.update(1, { name: 'newName' });

      expect(restockAlerts.processProductRestock).not.toHaveBeenCalled();
    });

    it('이미지 교체 시 manager.delete 가 먼저 호출됨', async () => {
      const existing = { id: 1, stock: 0 } as Product;
      productRepo.findOne.mockResolvedValue(existing);
      manager.save.mockResolvedValue(existing);

      await service.update(1, { images: [{ url: 'new.jpg' }] });

      expect(manager.delete).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('없는 ID 삭제 시 NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null as unknown as Product);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('정상 삭제 후 메시지 반환 및 캐시 무효화', async () => {
      const existing = { id: 1 } as Product;
      productRepo.findOne.mockResolvedValue(existing);
      productRepo.remove.mockResolvedValue(existing);

      const result = await service.remove(1);

      expect(result).toEqual({ message: '삭제되었습니다.' });
      expect(cacheService.del).toHaveBeenCalled();
      expect(cacheService.delPattern).toHaveBeenCalled();
    });
  });
});
