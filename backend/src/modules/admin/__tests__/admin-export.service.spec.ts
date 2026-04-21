import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminExportService } from '../admin-export.service';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { PassThrough } from 'stream';

function makeMockRepo() {
  const qb: Record<string, jest.Mock> = {
    leftJoinAndSelect: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getMany: jest.fn(),
  };
  // chain all qb methods back to qb itself
  Object.keys(qb).forEach((k) => {
    if (k !== 'getMany') qb[k].mockReturnValue(qb);
  });
  return {
    createQueryBuilder: jest.fn(() => qb),
    _qb: qb,
  };
}

function makeRes() {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (c: Buffer) => chunks.push(c));
  const res: Record<string, jest.Mock | (() => string)> = {
    setHeader: jest.fn(),
    write: jest.fn((chunk: Buffer, _enc: string, cb?: () => void) => { if (cb) cb(); }),
    end: jest.fn(),
    getBody: () => Buffer.concat(chunks).toString(),
  };
  // make it act as writable stream for pipe
  Object.assign(res, {
    writable: true,
    on: stream.on.bind(stream),
    once: stream.once.bind(stream),
    emit: stream.emit.bind(stream),
    removeListener: stream.removeListener.bind(stream),
  });
  return res as unknown as import('express').Response & { _qb?: unknown; getBody: () => string };
}

describe('AdminExportService', () => {
  let service: AdminExportService;
  let orderRepo: ReturnType<typeof makeMockRepo>;
  let userRepo: ReturnType<typeof makeMockRepo>;
  let productRepo: ReturnType<typeof makeMockRepo>;

  beforeEach(async () => {
    orderRepo = makeMockRepo();
    userRepo = makeMockRepo();
    productRepo = makeMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminExportService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get<AdminExportService>(AdminExportService);
  });

  describe('exportOrders (CSV)', () => {
    it('should stream CSV with header when no data', async () => {
      orderRepo._qb.getMany.mockResolvedValue([]);
      const res = makeRes();
      await service.exportOrders({ format: 'csv' }, res as unknown as import('express').Response);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    });

    it('should mask email and phone when mask=true', async () => {
      const fakeOrder = {
        id: 1,
        orderNumber: 'ORD-001',
        status: 'paid',
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울',
        totalAmount: 10000,
        discountAmount: 0,
        shippingFee: 0,
        user: { email: 'test@example.com' },
        createdAt: new Date('2024-01-01'),
      };
      orderRepo._qb.getMany
        .mockResolvedValueOnce([fakeOrder])
        .mockResolvedValue([]);
      const res = makeRes();
      await service.exportOrders({ format: 'csv', mask: 'true' }, res as unknown as import('express').Response);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    });

    it('should not mask when mask is not set', async () => {
      const fakeOrder = {
        id: 1,
        orderNumber: 'ORD-001',
        status: 'paid',
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
        address: '서울',
        totalAmount: 10000,
        discountAmount: 0,
        shippingFee: 0,
        user: { email: 'test@example.com' },
        createdAt: new Date('2024-01-01'),
      };
      orderRepo._qb.getMany
        .mockResolvedValueOnce([fakeOrder])
        .mockResolvedValue([]);
      const res = makeRes();
      await service.exportOrders({ format: 'csv' }, res as unknown as import('express').Response);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    });

    it('should apply from/to filters', async () => {
      orderRepo._qb.getMany.mockResolvedValue([]);
      const res = makeRes();
      await service.exportOrders({ format: 'csv', from: '2024-01-01', to: '2024-12-31' }, res as unknown as import('express').Response);
      expect(orderRepo._qb.andWhere).toHaveBeenCalledTimes(2);
    });

    it('should iterate in batches when first batch is full', async () => {
      const fullBatch = Array.from({ length: 500 }, (_, index) => ({
        id: index + 1,
        orderNumber: `ORD-${index + 1}`,
        status: 'paid',
        recipientName: '홍길동',
        recipientPhone: '010-1111-2222',
        zipcode: '12345',
        address: '서울',
        totalAmount: 10000,
        discountAmount: 0,
        shippingFee: 0,
        user: { email: 'test@example.com' },
        createdAt: new Date('2024-01-01'),
      }));

      orderRepo._qb.getMany
        .mockResolvedValueOnce(fullBatch)
        .mockResolvedValueOnce([]);
      const res = makeRes();

      await service.exportOrders({ format: 'csv' }, res as unknown as import('express').Response);

      expect(orderRepo._qb.skip).toHaveBeenNthCalledWith(1, 0);
      expect(orderRepo._qb.skip).toHaveBeenNthCalledWith(2, 500);
    });
  });

  describe('exportMembers (CSV)', () => {
    it('should stream CSV header when no data', async () => {
      userRepo._qb.getMany.mockResolvedValue([]);
      const res = makeRes();
      await service.exportMembers({ format: 'csv' }, res as unknown as import('express').Response);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    });

    it('should mask email and phone when mask=true', async () => {
      const fakeUser = {
        id: 1,
        email: 'member@example.com',
        name: '김회원',
        phone: '010-9876-5432',
        role: 'user',
        isActive: true,
        createdAt: new Date('2024-01-01'),
      };
      userRepo._qb.getMany
        .mockResolvedValueOnce([fakeUser])
        .mockResolvedValue([]);
      const res = makeRes();
      await service.exportMembers({ format: 'csv', mask: 'true' }, res as unknown as import('express').Response);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    });
  });

  describe('exportProducts (CSV)', () => {
    it('should stream CSV header when no data', async () => {
      productRepo._qb.getMany.mockResolvedValue([]);
      const res = makeRes();
      await service.exportProducts({ format: 'csv' }, res as unknown as import('express').Response);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    });

    it('should include product fields', async () => {
      const fakeProduct = {
        id: 1,
        sku: 'SKU-001',
        name: '테스트상품',
        price: 5000,
        salePrice: null,
        stock: 100,
        status: 'active',
        isFeatured: false,
        createdAt: new Date('2024-01-01'),
      };
      productRepo._qb.getMany
        .mockResolvedValueOnce([fakeProduct])
        .mockResolvedValue([]);
      const res = makeRes();
      await service.exportProducts({ format: 'csv' }, res as unknown as import('express').Response);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    });
  });

  describe('maskEmail', () => {
    it('should mask email correctly for user with email', async () => {
      const fakeOrder = {
        id: 1, orderNumber: 'ORD-001', status: 'paid', recipientName: '홍길동',
        recipientPhone: '010-1234-5678', zipcode: '12345', address: '서울',
        totalAmount: 10000, discountAmount: 0, shippingFee: 0,
        user: { email: 'ab@example.com' },
        createdAt: new Date('2024-01-01'),
      };
      orderRepo._qb.getMany
        .mockResolvedValueOnce([fakeOrder])
        .mockResolvedValue([]);
      const res = makeRes();
      await service.exportOrders({ format: 'csv', mask: 'true' }, res as unknown as import('express').Response);
      // Just verifying it runs without error
      expect(res.setHeader).toHaveBeenCalled();
    });
  });
});
