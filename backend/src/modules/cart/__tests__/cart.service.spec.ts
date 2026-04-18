import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CartService } from '../cart.service';
import { CartItem } from '../entities/cart-item.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductOption } from '../../products/entities/product-option.entity';

const mockCartItemRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockProductRepo = {
  findOne: jest.fn(),
};

const mockProductOptionRepo = {
  findOne: jest.fn(),
};

const buildQueryBuilder = (items: CartItem[]) => {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(items),
  };
  return qb;
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(CartItem), useValue: mockCartItemRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        {
          provide: getRepositoryToken(ProductOption),
          useValue: mockProductOptionRepo,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns items with correct totalAmount calculation', async () => {
      // price=29000, salePrice=24000, priceAdjustment=1000, quantity=2 → unitPrice=25000, subtotal=50000
      const mockItems = [
        {
          id: 1,
          productId: 1,
          productOptionId: 1,
          quantity: 2,
          product: {
            id: 1,
            price: 29000,
            salePrice: 24000,
          } as Product,
          option: {
            id: 1,
            priceAdjustment: 1000,
          } as ProductOption,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as CartItem[];

      mockCartItemRepo.createQueryBuilder.mockReturnValue(
        buildQueryBuilder(mockItems),
      );

      const result = await service.findAll(1);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].unitPrice).toBe(25000);
      expect(result.items[0].subtotal).toBe(50000);
      expect(result.totalAmount).toBe(50000);
      expect(result.itemCount).toBe(2);
    });

    it('returns empty cart when no items', async () => {
      mockCartItemRepo.createQueryBuilder.mockReturnValue(
        buildQueryBuilder([]),
      );

      const result = await service.findAll(1);

      expect(result.items).toHaveLength(0);
      expect(result.totalAmount).toBe(0);
      expect(result.itemCount).toBe(0);
    });
  });

  describe('add', () => {
    it('creates new cart item when no existing item', async () => {
      mockProductRepo.findOne.mockResolvedValue({ id: 1 } as Product);
      mockCartItemRepo.findOne.mockResolvedValue(null);
      mockCartItemRepo.create.mockReturnValue({ id: 1 });
      mockCartItemRepo.save.mockResolvedValue({ id: 1 });

      const qb = buildQueryBuilder([]);
      mockCartItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.add(1, { productId: 1, productOptionId: null, quantity: 1 });

      expect(mockCartItemRepo.create).toHaveBeenCalledWith({
        userId: 1,
        productId: 1,
        productOptionId: null,
        quantity: 1,
      });
      expect(mockCartItemRepo.save).toHaveBeenCalled();
    });

    it('upserts quantity when same user+product+option exists', async () => {
      mockProductRepo.findOne.mockResolvedValue({ id: 1 } as Product);
      const existing = { id: 1, userId: 1, productId: 1, productOptionId: null, quantity: 3 } as CartItem;
      mockCartItemRepo.findOne.mockResolvedValue(existing);
      mockCartItemRepo.save.mockResolvedValue({ ...existing, quantity: 5 });

      const qb = buildQueryBuilder([]);
      mockCartItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.add(1, { productId: 1, productOptionId: null, quantity: 2 });

      expect(mockCartItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5 }),
      );
      expect(mockCartItemRepo.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for non-existent product', async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(
        service.add(1, { productId: 999999, productOptionId: null, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateQuantity', () => {
    it('updates quantity for item owner', async () => {
      const item = { id: 1, userId: 1, quantity: 2 } as CartItem;
      mockCartItemRepo.findOne.mockResolvedValue(item);
      mockCartItemRepo.save.mockResolvedValue({ ...item, quantity: 5 });

      await service.updateQuantity(1, 1, { quantity: 5 });

      expect(mockCartItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5 }),
      );
    });

    it('throws ForbiddenException when user does not own the item', async () => {
      const item = { id: 1, userId: 1, quantity: 2 } as CartItem;
      mockCartItemRepo.findOne.mockResolvedValue(item);

      await expect(
        service.updateQuantity(1, 2, { quantity: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockCartItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuantity(999, 1, { quantity: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes item for owner', async () => {
      const item = { id: 1, userId: 1 } as CartItem;
      mockCartItemRepo.findOne.mockResolvedValue(item);
      mockCartItemRepo.remove.mockResolvedValue(item);

      const result = await service.remove(1, 1);

      expect(result).toEqual({ message: '삭제되었습니다.' });
      expect(mockCartItemRepo.remove).toHaveBeenCalledWith(item);
    });

    it('throws ForbiddenException when user does not own the item', async () => {
      const item = { id: 1, userId: 1 } as CartItem;
      mockCartItemRepo.findOne.mockResolvedValue(item);

      await expect(service.remove(1, 2)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockCartItemRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validate', () => {
    const buildValidateQb = (items: Partial<CartItem>[]) => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(items),
      };
      return qb;
    };

    it('returns available=true for active in-stock item without option', async () => {
      const items = [
        {
          id: 1,
          userId: 1,
          quantity: 2,
          product: { id: 1, price: 20000, salePrice: null, stock: 5, status: 'active' } as Product,
          option: null,
        },
      ];
      mockCartItemRepo.createQueryBuilder.mockReturnValue(buildValidateQb(items));

      const result = await service.validate(1, [1]);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        itemId: 1,
        available: true,
        unitPrice: 20000,
        stock: 5,
        issues: [],
      });
    });

    it('returns out_of_stock issue when product stock is 0', async () => {
      const items = [
        {
          id: 2,
          userId: 1,
          quantity: 1,
          product: { id: 2, price: 15000, salePrice: null, stock: 0, status: 'active' } as Product,
          option: null,
        },
      ];
      mockCartItemRepo.createQueryBuilder.mockReturnValue(buildValidateQb(items));

      const result = await service.validate(1, [2]);

      expect(result.results[0].available).toBe(false);
      expect(result.results[0].issues).toContain('out_of_stock');
    });

    it('returns out_of_stock issue when product status is soldout', async () => {
      const items = [
        {
          id: 3,
          userId: 1,
          quantity: 1,
          product: { id: 3, price: 10000, salePrice: null, stock: 10, status: 'soldout' } as Product,
          option: null,
        },
      ];
      mockCartItemRepo.createQueryBuilder.mockReturnValue(buildValidateQb(items));

      const result = await service.validate(1, [3]);

      expect(result.results[0].available).toBe(false);
      expect(result.results[0].issues).toContain('out_of_stock');
    });

    it('returns discontinued issue when product status is hidden', async () => {
      const items = [
        {
          id: 4,
          userId: 1,
          quantity: 1,
          product: { id: 4, price: 10000, salePrice: null, stock: 5, status: 'hidden' } as Product,
          option: null,
        },
      ];
      mockCartItemRepo.createQueryBuilder.mockReturnValue(buildValidateQb(items));

      const result = await service.validate(1, [4]);

      expect(result.results[0].available).toBe(false);
      expect(result.results[0].issues).toContain('discontinued');
    });

    it('uses option stock when option is present', async () => {
      const items = [
        {
          id: 5,
          userId: 1,
          quantity: 1,
          product: { id: 5, price: 20000, salePrice: null, stock: 10, status: 'active' } as Product,
          option: { id: 1, priceAdjustment: 2000, stock: 0 } as ProductOption,
        },
      ];
      mockCartItemRepo.createQueryBuilder.mockReturnValue(buildValidateQb(items));

      const result = await service.validate(1, [5]);

      expect(result.results[0].stock).toBe(0);
      expect(result.results[0].unitPrice).toBe(22000);
      expect(result.results[0].available).toBe(false);
      expect(result.results[0].issues).toContain('out_of_stock');
    });

    it('uses salePrice when set', async () => {
      const items = [
        {
          id: 6,
          userId: 1,
          quantity: 1,
          product: { id: 6, price: 30000, salePrice: 25000, stock: 3, status: 'active' } as Product,
          option: null,
        },
      ];
      mockCartItemRepo.createQueryBuilder.mockReturnValue(buildValidateQb(items));

      const result = await service.validate(1, [6]);

      expect(result.results[0].unitPrice).toBe(25000);
      expect(result.results[0].available).toBe(true);
    });

    it('returns empty results when no matching items', async () => {
      mockCartItemRepo.createQueryBuilder.mockReturnValue(buildValidateQb([]));

      const result = await service.validate(1, [999]);

      expect(result.results).toHaveLength(0);
    });
  });
});
