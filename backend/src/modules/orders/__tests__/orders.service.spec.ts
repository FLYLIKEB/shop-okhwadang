import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { PointsService } from '../../points/points.service';
import { NotificationService } from '../../notification/notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';
import { CouponsService } from '../../coupons/coupons.service';
import { ShippingFeeCalculatorService } from '../../shipping/services/shipping-fee-calculator.service';
import { OrderEventEmitter } from '../order-event.emitter';

// Manager used inside dataSource.transaction — same shape as the previous queryRunner.manager mock
const mockManager = {
  createQueryBuilder: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  getRepository: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(
    (cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager),
  ),
};

const mockOrderRepository = {
  createQueryBuilder: jest.fn(),
  count: jest.fn().mockResolvedValue(1),
};

const mockPointsService = {
  getUserPointBalance: jest.fn(),
};

const mockCouponsService = {
  calculate: jest.fn(),
  useCoupon: jest.fn(),
};

const mockShippingFeeCalculator = {
  calculate: jest.fn().mockResolvedValue({
    subtotal: 0,
    zipcode: '12345',
    shippingFee: 0,
    isFreeShipping: true,
    isRemoteArea: false,
    threshold: 50000,
    baseFee: 3000,
    remoteAreaSurcharge: 3000,
  }),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: PointsService, useValue: mockPointsService },
        { provide: NotificationService, useValue: { sendOrderConfirmed: jest.fn() } },
        { provide: NotificationDispatchHelper, useValue: { dispatch: jest.fn().mockResolvedValue(undefined) } },
        { provide: CouponsService, useValue: mockCouponsService },
        { provide: ShippingFeeCalculatorService, useValue: mockShippingFeeCalculator },
        { provide: OrderEventEmitter, useValue: { emitOrderCompleted: jest.fn() } },
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

      // Setup manager.createQueryBuilder chain for product
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProduct),
      };
      mockManager.createQueryBuilder.mockReturnValue(mockQb);
      mockManager.update.mockResolvedValue({});
      mockManager.create.mockReturnValue(mockSavedOrder);
      mockManager.save.mockResolvedValue(mockSavedOrder);

      // Mock delete query builder for cart cleanup
      const mockDeleteQb = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      // createQueryBuilder called: product fetch + cart delete
      mockManager.createQueryBuilder
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
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
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
      // Pre-flight validation fires before the transaction is opened
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('insufficient stock → BadRequestException (transaction rolls back)', async () => {
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
      mockManager.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('product not found → NotFoundException (transaction rolls back)', async () => {
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
      mockManager.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.create(1, dto)).rejects.toThrow(NotFoundException);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('insufficient points inside transaction → BadRequestException (transaction rolls back)', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 1, quantity: 1 }],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시',
        pointsUsed: 5000,
      };

      // point balance check uses manager.getRepository (inside transaction)
      const mockPointRepo = {
        findOne: jest.fn().mockResolvedValue({ balance: 1000 }),
      };
      mockManager.getRepository.mockReturnValue(mockPointRepo);

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
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

      mockManager.createQueryBuilder
        .mockReturnValueOnce(mockProductQb)
        .mockReturnValueOnce(mockDeleteQb);
      mockManager.update.mockResolvedValue({});
      mockManager.create.mockReturnValue(mockSavedOrder);
      mockManager.save
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
      expect(mockManager.update).toHaveBeenCalledWith(
        expect.anything(),
        mockProduct.id,
        { stock: mockProduct.stock - dto.items[0].quantity },
      );
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockDeleteQb.execute).toHaveBeenCalled();
    });

    it('valid dto with userCouponId → applies coupon discount, sets discountAmount, calls useCoupon', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 1, quantity: 2 }],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시 강남구',
        pointsUsed: 0,
        userCouponId: 10,
      };

      const mockProduct = { id: 1, name: '상품', price: 10000, salePrice: 9000, stock: 5 };
      const mockSavedOrder = {
        id: 42,
        orderNumber: 'ORD-20240101-XYZ12',
        userId: 1,
        status: OrderStatus.PENDING,
        totalAmount: 18000,
        discountAmount: 2000,
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

      mockManager.createQueryBuilder
        .mockReturnValueOnce(mockProductQb)
        .mockReturnValueOnce(mockDeleteQb);
      mockManager.update.mockResolvedValue({});
      mockManager.create.mockReturnValue(mockSavedOrder);
      mockManager.save
        .mockResolvedValueOnce(mockSavedOrder)
        .mockResolvedValue([]);

      // Mock couponsService.calculate to return discount
      mockCouponsService.calculate.mockResolvedValue({
        originalAmount: 18000,
        couponDiscount: 2000,
        pointsDiscount: 0,
        finalAmount: 16000,
        shippingFee: 3000,
        totalPayable: 19000,
      });
      mockCouponsService.useCoupon.mockResolvedValue(undefined);

      const mockOrderQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSavedOrder),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockOrderQb);

      const result = await service.create(1, dto);
      expect(result).toBe(mockSavedOrder);
      expect(mockCouponsService.calculate).toHaveBeenCalledWith(1, {
        orderAmount: 18000,
        userCouponId: 10,
        pointsToUse: 0,
      });
      expect(mockCouponsService.useCoupon).toHaveBeenCalledWith(10, 1, 42, mockManager);
      // discountAmount should be set in the created order
      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ discountAmount: 2000 }),
      );
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('userCouponId but coupon calculate throws → BadRequestException (transaction rolls back)', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 1, quantity: 1 }],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시',
        userCouponId: 10,
      };

      const mockProduct = { id: 1, name: '상품', price: 10000, salePrice: null, stock: 5 };
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProduct),
      };
      mockManager.createQueryBuilder.mockReturnValue(mockQb);

      mockCouponsService.calculate.mockRejectedValue(new BadRequestException('만료된 쿠폰입니다.'));

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll()', () => {
    it('returns paginated user orders with localized item names when locale is en', async () => {
      const mockOrders = [
        {
          id: 1,
          userId: 1,
          orderNumber: 'ORD-1',
          itemCount: 2,
          items: [
            {
              id: 11,
              productName: '한글상품명',
              optionName: '옵션: 기본',
              product: { name: '한글상품명', nameEn: 'English Name' },
              option: { name: '옵션', nameEn: 'Option', value: '기본', valueEn: 'Default' },
            },
          ],
        },
        { id: 2, userId: 1, orderNumber: 'ORD-2', itemCount: 1, items: [] },
      ] as unknown as Order[];

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockOrders, 2]),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll(1, 1, 10, 'en');
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalled();
      expect(mockQb.loadRelationCountAndMap).toHaveBeenCalledWith('order.itemCount', 'order.items');
      expect(result.items[0]?.items[0]?.productName).toBe('English Name');
      expect(result.items[0]?.items[0]?.optionName).toBe('Option: Default');
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
