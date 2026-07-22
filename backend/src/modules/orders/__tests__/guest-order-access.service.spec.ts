import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { GuestOrderAccessService } from '../guest-order-access.service';
import { GuestOrderAccess } from '../entities/guest-order-access.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { LookupGuestOrderDto } from '../dto/lookup-guest-order.dto';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 11,
    userId: null,
    guestEmailNormalized: 'guest@example.com',
    orderNumber: 'ORD-20260722-ABCDE',
    orderLocale: 'ko',
    status: OrderStatus.PENDING,
    totalAmount: 12000,
    discountAmount: 0,
    shippingFee: 0,
    recipientName: '홍길동',
    recipientPhone: '010-1234-5678',
    zipcode: '12345',
    address: '서울시 강남구',
    addressDetail: null,
    memo: null,
    cancelReason: null,
    cancelledAt: null,
    pointsUsed: 0,
    createdAt: new Date('2026-07-22T00:00:00.000Z'),
    updatedAt: new Date('2026-07-22T00:00:00.000Z'),
    user: null,
    items: [],
    ...overrides,
  } as Order;
}

function makeAccess(overrides: Partial<GuestOrderAccess> = {}): GuestOrderAccess {
  return {
    id: 21,
    orderId: 11,
    tokenDigest: createHash('sha256').update('seed-token').digest('hex'),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    supersededAt: null,
    supersededById: null,
    createdAt: new Date('2026-07-22T00:00:00.000Z'),
    order: makeOrder(),
    supersededBy: null,
    ...overrides,
  } as GuestOrderAccess;
}

function makeOrderQueryBuilder(result: Order | null) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
}

function makeAccessQueryBuilder(result: GuestOrderAccess | null) {
  return {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
}

describe('GuestOrderAccessService', () => {
  let service: GuestOrderAccessService;
  let accessRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let orderRepository: {
    createQueryBuilder: jest.Mock;
  };
  let dataSource: {
    createQueryRunner: jest.Mock;
  };

  beforeEach(() => {
    accessRepository = {
      create: jest.fn((input) => ({ id: 99, ...input })),
      save: jest.fn(async (input) => input),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    orderRepository = {
      createQueryBuilder: jest.fn(),
    };

    dataSource = {
      createQueryRunner: jest.fn(),
    };

    service = new GuestOrderAccessService(
      accessRepository as never,
      orderRepository as never,
      dataSource as unknown as DataSource,
    );
  });

  it('issues a raw token once while persisting only its SHA-256 digest with 30-day expiry', async () => {
    const issued = await service.issueAccessToken(11);

    expect(issued.guestAccessToken).toMatch(/^[a-f0-9]{64}$/);
    expect(accessRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 11,
        tokenDigest: createHash('sha256').update(issued.guestAccessToken).digest('hex'),
        supersededAt: null,
        supersededById: null,
      }),
    );
    expect(accessRepository.create.mock.calls[0][0].tokenDigest).not.toBe(issued.guestAccessToken);
    expect(issued.guestAccessTokenExpiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    expect(issued.guestAccessTokenExpiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000 + 5_000);
  });

  it('normalizes lookup email and order number before querying the guest order', async () => {
    const order = makeOrder();
    const qb = makeOrderQueryBuilder(order);
    orderRepository.createQueryBuilder.mockReturnValue(qb);

    const dto: LookupGuestOrderDto = {
      orderNumber: '  ORD-20260722-ABCDE  ',
      email: ' Guest@Example.com ',
      locale: 'ko',
    };

    await expect(service.lookupOrderOrThrow(dto)).resolves.toBe(order);
    expect(qb.where).toHaveBeenCalledWith('order.orderNumber = :orderNumber', {
      orderNumber: 'ORD-20260722-ABCDE',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('order.guestEmailNormalized = :guestEmailNormalized', {
      guestEmailNormalized: 'guest@example.com',
    });
  });

  it('lookup issuance supersedes the current active token and returns a replacement token', async () => {
    const order = makeOrder();
    const activeAccess = makeAccess({ id: 31, orderId: order.id });
    const lookupQb = makeOrderQueryBuilder(order);
    const lockedOrderQb = makeOrderQueryBuilder(order);
    const accessQb = makeAccessQueryBuilder(activeAccess);

    orderRepository.createQueryBuilder
      .mockReturnValueOnce(lookupQb)
      .mockReturnValueOnce(lockedOrderQb);
    accessRepository.createQueryBuilder.mockReturnValue(accessQb);

    const manager = {
      queryRunner: {},
      getRepository: jest.fn((entity) => {
        if (entity === GuestOrderAccess) return accessRepository;
        if (entity === Order) return orderRepository;
        throw new Error(`Unexpected repository request: ${String(entity)}`);
      }),
    } as unknown as EntityManager;

    jest.spyOn(service, 'withOrderAccessLock').mockImplementation(async (_orderId, operation) => operation(manager));

    const result = await service.lookupAndIssueAccessToken({
      orderNumber: order.orderNumber,
      email: 'Guest@Example.com',
      locale: 'ko',
    });

    expect(result.order.id).toBe(order.id);
    expect(result.guestAccessToken).toMatch(/^[a-f0-9]{64}$/);
    expect(activeAccess.supersededAt).toBeInstanceOf(Date);
    expect(activeAccess.supersededById).toBe(99);
    expect(accessRepository.save).toHaveBeenCalledWith(activeAccess);
  });

  it('rotates the current token and rejects the stale superseded token afterward', async () => {
    const currentRawToken = 'a'.repeat(64);
    const currentAccess = makeAccess({
      id: 41,
      orderId: 11,
      tokenDigest: createHash('sha256').update(currentRawToken).digest('hex'),
    });
    const rotateQb = makeAccessQueryBuilder(currentAccess);
    accessRepository.createQueryBuilder.mockReturnValue(rotateQb);

    const manager = {
      queryRunner: {},
      getRepository: jest.fn((entity) => {
        if (entity === GuestOrderAccess) return accessRepository;
        throw new Error(`Unexpected repository request: ${String(entity)}`);
      }),
    } as unknown as EntityManager;

    const rotated = await service.rotateAccessTokenForOrder(11, currentRawToken, manager);

    expect(rotated.guestAccessToken).toMatch(/^[a-f0-9]{64}$/);
    expect(currentAccess.supersededAt).toBeInstanceOf(Date);
    expect(currentAccess.supersededById).toBe(99);

    accessRepository.findOne.mockResolvedValueOnce(currentAccess);
    await expect(service.getValidAccessOrThrow(11, currentRawToken)).rejects.toThrow(UnauthorizedException);

    accessRepository.findOne.mockResolvedValueOnce(rotated.access);
    await expect(service.getValidAccessOrThrow(11, rotated.guestAccessToken)).resolves.toBe(rotated.access);
  });
});
