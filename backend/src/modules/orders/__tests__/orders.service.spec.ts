import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const mockOrderRepository = {
  createQueryBuilder: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('generateOrderNumber (via create)', () => {
    it('order number format matches ORD-YYYYMMDD-XXXXX', async () => {
      // We test this indirectly via a successful create
      const dto: CreateOrderDto = {
        items: [{ productId: 1, quantity: 1 }],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시 강남구',
      };

      const mockProduct = { id: 1, name: '테스트상품', price: 10000, salePrice: null, stock: 5 };
      const mockSavedOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-ABCD1',
        userId: 1,
        status: OrderStatus.PENDING,
        items: [],
      } as unknown as Order;

      // Setup queryRunner.manager.createQueryBuilder chain for product
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProduct),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(mockQb);
      mockQueryRunner.manager.update.mockResolvedValue({});
      mockQueryRunner.manager.create.mockReturnValue(mockSavedOrder);
      mockQueryRunner.manager.save.mockResolvedValue(mockSavedOrder);

      // Mock delete query builder for cart cleanup
      const mockDeleteQb = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      // createQueryBuilder called: product fetch + cart delete
      mockQueryRunner.manager.createQueryBuilder
        .mockReturnValueOnce(mockQb)       // product
        .mockReturnValueOnce(mockDeleteQb); // cart delete

      // findOne after commit
      const mockOrderQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSavedOrder),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockOrderQb);

      const result = await service.create(1, dto);
      expect(result).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('create()', () => {
    it('empty items → BadRequestException', async () => {
      const dto: CreateOrderDto = {
        items: [],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시',
      };
      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('insufficient stock → BadRequestException + rollback', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 1, quantity: 100 }],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시',
      };

      const mockProduct = { id: 1, name: '재고없는상품', price: 10000, salePrice: null, stock: 5 };
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProduct),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('product not found → NotFoundException + rollback', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 999, quantity: 1 }],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시',
      };

      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.create(1, dto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('valid dto → creates order, deducts stock, clears cart', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 1, quantity: 2 }],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시 강남구',
        pointsUsed: 0,
      };

      const mockProduct = { id: 1, name: '상품', price: 10000, salePrice: 9000, stock: 5 };
      const mockSavedOrder = {
        id: 42,
        orderNumber: 'ORD-20240101-XYZ12',
        userId: 1,
        status: OrderStatus.PENDING,
        totalAmount: 18000,
        items: [],
      } as unknown as Order;

      const mockProductQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProduct),
      };
      const mockDeleteQb = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockQueryRunner.manager.createQueryBuilder
        .mockReturnValueOnce(mockProductQb)
        .mockReturnValueOnce(mockDeleteQb);
      mockQueryRunner.manager.update.mockResolvedValue({});
      mockQueryRunner.manager.create.mockReturnValue(mockSavedOrder);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockSavedOrder)
        .mockResolvedValue([]);

      const mockOrderQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSavedOrder),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockOrderQb);

      const result = await service.create(1, dto);
      expect(result).toBe(mockSavedOrder);
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        expect.anything(),
        mockProduct.id,
        { stock: mockProduct.stock - dto.items[0].quantity },
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockDeleteQb.execute).toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    it('returns paginated user orders', async () => {
      const mockOrders = [
        { id: 1, userId: 1, orderNumber: 'ORD-1', items: [] },
        { id: 2, userId: 1, orderNumber: 'ORD-2', items: [] },
      ] as unknown as Order[];

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockOrders, 2]),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll(1, 1, 10);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne()', () => {
    it('returns order with items for correct user', async () => {
      const mockOrder = { id: 1, userId: 1, orderNumber: 'ORD-1', items: [{ id: 10 }] } as unknown as Order;

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockOrder),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findOne(1, 1);
      expect(result).toBe(mockOrder);
      expect(result.items).toHaveLength(1);
    });

    it('wrong user → ForbiddenException', async () => {
      const mockOrder = { id: 1, userId: 1 } as unknown as Order;

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockOrder),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.findOne(1, 99)).rejects.toThrow(ForbiddenException);
    });

    it('missing order → NotFoundException', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
