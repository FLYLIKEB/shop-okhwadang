import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { GuestOrdersService } from '../guest-orders.service';
import { Order } from '../entities/order.entity';
import { GuestOrderCreationWorkflowService } from '../guest-order-creation.workflow.service';
import { GuestOrderAccessService } from '../guest-order-access.service';
import { OrderPostCommitService } from '../order-post-commit.service';
import { CreateGuestOrderDto } from '../dto/create-guest-order.dto';
import { LookupGuestOrderDto } from '../dto/lookup-guest-order.dto';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 11,
    orderNumber: 'ORD-20260722-ABCDE',
    userId: null,
    orderLocale: 'ko',
    items: [
      {
        productName: '기본 상품명',
        optionName: '기본 옵션',
        product: {
          name: '기본 상품명',
          nameEn: 'English Product',
        },
        option: {
          name: '색상',
          nameEn: 'Color',
          value: '빨강',
          valueEn: 'Red',
        },
      },
    ],
    ...overrides,
  } as Order;
}

function makeOrderQueryBuilder(result: Order | null) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
}

describe('GuestOrdersService', () => {
  let service: GuestOrdersService;
  let orderRepository: {
    createQueryBuilder: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };
  let guestOrderCreationWorkflow: {
    assertCreatePayload: jest.Mock;
    runCreateOrderTransaction: jest.Mock;
  };
  let guestOrderAccessService: {
    issueAccessToken: jest.Mock;
    getOrderForAccessOrThrow: jest.Mock;
    lookupAndIssueAccessToken: jest.Mock;
  };
  let orderPostCommitService: {
    dispatchOrderCreated: jest.Mock;
  };

  beforeEach(() => {
    orderRepository = {
      createQueryBuilder: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    guestOrderCreationWorkflow = {
      assertCreatePayload: jest.fn(),
      runCreateOrderTransaction: jest.fn(),
    };

    guestOrderAccessService = {
      issueAccessToken: jest.fn(),
      getOrderForAccessOrThrow: jest.fn(),
      lookupAndIssueAccessToken: jest.fn(),
    };

    orderPostCommitService = {
      dispatchOrderCreated: jest.fn().mockResolvedValue(undefined),
    };

    service = new GuestOrdersService(
      orderRepository as never,
      dataSource as unknown as DataSource,
      guestOrderCreationWorkflow as unknown as GuestOrderCreationWorkflowService,
      guestOrderAccessService as unknown as GuestOrderAccessService,
      orderPostCommitService as unknown as OrderPostCommitService,
    );
  });

  it('creates a guest order, issues a token, dispatches post-commit work, and returns the localized order view', async () => {
    const dto: CreateGuestOrderDto = {
      items: [{ productId: 5, quantity: 2 }],
      guestEmail: 'guest@example.com',
      recipientName: '게스트',
      recipientPhone: '010-1111-2222',
      zipcode: '12345',
      address: '서울시 강남구',
      addressDetail: '101호',
      orderLocale: 'en',
    };
    const savedOrder = makeOrder({ id: 19, orderNumber: 'ORD-20260722-ZYXWV' });
    const postCommit = {
      savedOrder,
      guestEmailNormalized: 'guest@example.com',
      totalPayable: 48000,
      recipientName: '게스트',
    };
    const guestAccessTokenExpiresAt = new Date('2026-08-21T00:00:00.000Z');
    const localizedOrder = makeOrder({ id: 19, orderLocale: 'en' });

    guestOrderCreationWorkflow.runCreateOrderTransaction.mockResolvedValue(postCommit);
    guestOrderAccessService.issueAccessToken.mockResolvedValue({
      guestAccessToken: 'issued-token',
      guestAccessTokenExpiresAt,
    });
    const txManager = {} as EntityManager;
    dataSource.transaction.mockImplementation(async (callback: (manager: EntityManager) => Promise<unknown>) =>
      callback(txManager),
    );
    jest.spyOn(service, 'findOne').mockResolvedValue(localizedOrder);

    const result = await service.create(dto);

    expect(guestOrderCreationWorkflow.assertCreatePayload).toHaveBeenCalledWith(dto);
    expect(guestOrderCreationWorkflow.runCreateOrderTransaction).toHaveBeenCalledWith(txManager, dto);
    expect(guestOrderAccessService.issueAccessToken).toHaveBeenCalledWith(19, txManager);
    expect(orderPostCommitService.dispatchOrderCreated).toHaveBeenCalledWith(null, postCommit);
    expect(service.findOne).toHaveBeenCalledWith(19, 'en');
    expect(result).toEqual({
      order: localizedOrder,
      guestAccessToken: 'issued-token',
      guestAccessTokenExpiresAt,
    });
  });

  it('delegates guest order detail access to the token access service', async () => {
    const order = makeOrder();
    guestOrderAccessService.getOrderForAccessOrThrow.mockResolvedValue(order);

    await expect(service.getById(11, 'guest-token', 'ko')).resolves.toBe(order);
    expect(guestOrderAccessService.getOrderForAccessOrThrow).toHaveBeenCalledWith(11, 'guest-token', 'ko');
  });

  it('delegates guest order lookup and token rotation to the access service', async () => {
    const dto: LookupGuestOrderDto = {
      orderNumber: 'ORD-20260722-ABCDE',
      email: 'guest@example.com',
      locale: 'en',
    };
    const order = makeOrder({ orderLocale: 'en' });
    const guestAccessTokenExpiresAt = new Date('2026-08-21T00:00:00.000Z');
    guestOrderAccessService.lookupAndIssueAccessToken.mockResolvedValue({
      order,
      guestAccessToken: 'rotated-token',
      guestAccessTokenExpiresAt,
    });

    await expect(service.lookup(dto)).resolves.toEqual({
      order,
      guestAccessToken: 'rotated-token',
      guestAccessTokenExpiresAt,
    });
    expect(guestOrderAccessService.lookupAndIssueAccessToken).toHaveBeenCalledWith(dto);
  });

  it('localizes product and option fields when english order detail is requested through the query-builder path', async () => {
    const order = makeOrder();
    const queryBuilder = makeOrderQueryBuilder(order);
    orderRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findOne(11, 'en');

    expect(queryBuilder.where).toHaveBeenCalledWith('order.id = :id', { id: 11 });
    expect(result.items[0].product.name).toBe('English Product');
    expect(result.items[0].productName).toBe('English Product');
    expect(result.items[0].option?.name).toBe('Color');
    expect(result.items[0].option?.value).toBe('Red');
    expect(result.items[0].optionName).toBe('Color: Red');
  });

  it('uses the manager repository fallback and orderLocale when the caller omits locale', async () => {
    const managerRepository = {
      findOne: jest.fn().mockResolvedValue(makeOrder({ orderLocale: 'en' })),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(managerRepository),
    } as unknown as EntityManager;

    const result = await service.findOne(15, undefined, manager);

    expect(managerRepository.findOne).toHaveBeenCalledWith({
      where: { id: 15 },
      relations: ['items', 'items.product', 'items.option'],
    });
    expect(result.items[0].product.name).toBe('English Product');
    expect(result.items[0].optionName).toBe('Color: Red');
  });

  it('returns the raw order object when locale is korean', async () => {
    const order = makeOrder();
    const queryBuilder = makeOrderQueryBuilder(order);
    orderRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.findOne(11, 'ko')).resolves.toBe(order);
  });

  it('throws when the order does not exist', async () => {
    const queryBuilder = makeOrderQueryBuilder(null);
    orderRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.findOne(404, 'ko')).rejects.toThrow(NotFoundException);
  });
});
