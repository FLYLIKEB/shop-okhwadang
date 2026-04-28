import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { RestockAlertsService } from '../restock-alerts.service';
import { RestockAlert } from '../entities/restock-alert.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductOption } from '../../products/entities/product-option.entity';
import { NotificationService } from '../../notification/notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';

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

describe('RestockAlertsService', () => {
  let service: RestockAlertsService;
  let alertRepo: RepoMock<RestockAlert>;
  let productRepo: RepoMock<Product>;
  let optionRepo: RepoMock<ProductOption>;
  let notificationService: { sendRestockAlert: jest.Mock };
  let dispatchHelper: { dispatch: jest.Mock };
  let originalFrontendUrl: string | undefined;

  beforeEach(async () => {
    originalFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'http://test.local';

    alertRepo = createRepoMock<RestockAlert>();
    productRepo = createRepoMock<Product>();
    optionRepo = createRepoMock<ProductOption>();
    notificationService = {
      sendRestockAlert: jest.fn().mockResolvedValue(undefined),
    };
    dispatchHelper = {
      dispatch: jest.fn().mockImplementation(async ({ send }: { send: (recipient: { email: string; name: string }) => Promise<void> }) => {
        await send({ email: 'u@test.com', name: '사용자' });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestockAlertsService,
        { provide: getRepositoryToken(RestockAlert), useValue: alertRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(ProductOption), useValue: optionRepo },
        { provide: NotificationService, useValue: notificationService },
        { provide: NotificationDispatchHelper, useValue: dispatchHelper },
      ],
    }).compile();

    service = module.get(RestockAlertsService);
  });

  afterEach(() => {
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalFrontendUrl;
    }
  });

  describe('createAlert', () => {
    it('상품을 찾지 못하면 NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null as unknown as Product);

      await expect(service.createAlert(1, 999, {})).rejects.toThrow(NotFoundException);
    });

    it('재고가 있는 상품에 등록 시도하면 BadRequestException', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, stock: 10 } as Product);

      await expect(service.createAlert(1, 1, {})).rejects.toThrow(BadRequestException);
    });

    it('이미 활성 알림이 있으면 기존 알림 반환', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, stock: 0 } as Product);
      const existing = { id: 5, userId: 1, productId: 1, notifiedAt: null } as unknown as RestockAlert;
      alertRepo.findOne.mockResolvedValue(existing);

      const result = await service.createAlert(1, 1, {});

      expect(result).toBe(existing);
      expect(alertRepo.save).not.toHaveBeenCalled();
    });

    it('재고 0 + 신규 알림 등록 성공', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, stock: 0 } as Product);
      alertRepo.findOne
        .mockResolvedValueOnce(null as unknown as RestockAlert) // existing check
        .mockResolvedValueOnce({ id: 99, userId: 1, productId: 1 } as unknown as RestockAlert); // findOrThrow after save
      const created = { id: 99, userId: 1, productId: 1 } as unknown as RestockAlert;
      alertRepo.create.mockReturnValue(created);
      alertRepo.save.mockResolvedValue(created);

      const result = await service.createAlert(1, 1, {});

      expect(alertRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 1,
        productId: 1,
        notifiedAt: null,
      }));
      expect(result.id).toBe(99);
    });

    it('productOptionId 지정 시 옵션 stock 으로 검증', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, stock: 10 } as Product);
      optionRepo.findOne.mockResolvedValue({ id: 5, productId: 1, stock: 0 } as ProductOption);
      alertRepo.findOne
        .mockResolvedValueOnce(null as unknown as RestockAlert)
        .mockResolvedValueOnce({ id: 99 } as unknown as RestockAlert);
      const created = { id: 99 } as unknown as RestockAlert;
      alertRepo.create.mockReturnValue(created);
      alertRepo.save.mockResolvedValue(created);

      await service.createAlert(1, 1, { productOptionId: 5 });

      expect(optionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, productId: 1 },
      });
    });

    it('지정한 옵션이 없으면 NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, stock: 10 } as Product);
      optionRepo.findOne.mockResolvedValue(null as unknown as ProductOption);

      await expect(
        service.createAlert(1, 1, { productOptionId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUserAlerts', () => {
    it('유저별 알림을 createdAt DESC 로 조회', async () => {
      alertRepo.find.mockResolvedValue([]);

      await service.findUserAlerts(1);

      expect(alertRepo.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['product', 'productOption'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('processProductRestock', () => {
    it('재고가 0->양수 가 아니면 아무 동작 없음', async () => {
      await service.processProductRestock(1, 5, 10); // stock 5 -> 10
      await service.processProductRestock(1, 0, 0); // 0 -> 0
      await service.processProductRestock(1, 10, 0); // 10 -> 0

      expect(alertRepo.find).not.toHaveBeenCalled();
      expect(dispatchHelper.dispatch).not.toHaveBeenCalled();
    });

    it('알림이 없으면 dispatch 없이 종료', async () => {
      alertRepo.find.mockResolvedValue([]);

      await service.processProductRestock(1, 0, 5);

      expect(dispatchHelper.dispatch).not.toHaveBeenCalled();
    });

    it('알림이 있으면 dispatch 후 notifiedAt 갱신', async () => {
      const alert = {
        id: 1,
        userId: 100,
        productId: 1,
        product: { name: '보이차', slug: 'pu-erh' },
      } as unknown as RestockAlert;
      alertRepo.find.mockResolvedValue([alert]);
      alertRepo.save.mockImplementation(async (entity: unknown) => entity as RestockAlert);

      await service.processProductRestock(1, 0, 10);

      expect(dispatchHelper.dispatch).toHaveBeenCalledTimes(1);
      expect(notificationService.sendRestockAlert).toHaveBeenCalledWith(
        'u@test.com',
        expect.objectContaining({
          recipientName: '사용자',
          productName: '보이차',
          productUrl: 'http://test.local/products/pu-erh',
        }),
      );
      expect(alertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, notifiedAt: expect.any(Date) }),
      );
    });

    it('FRONTEND_URL 미설정 시 에러', async () => {
      delete process.env.FRONTEND_URL;
      const alert = {
        id: 1,
        userId: 100,
        productId: 1,
        product: { name: '보이차', slug: 'pu-erh' },
      } as unknown as RestockAlert;
      alertRepo.find.mockResolvedValue([alert]);
      alertRepo.save.mockResolvedValue(alert);

      await expect(service.processProductRestock(1, 0, 10)).rejects.toThrow(
        'FRONTEND_URL environment variable is required',
      );
    });
  });
});
