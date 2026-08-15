import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { AppModule } from '../src/app.module';
import { PointsService } from '../src/modules/points/points.service';
import { PointHistory } from '../src/modules/coupons/entities/point-history.entity';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { Product, ProductStatus } from '../src/modules/products/entities/product.entity';
import { Order } from '../src/modules/orders/entities/order.entity';
import { OrderItem } from '../src/modules/orders/entities/order-item.entity';
import { OrderCreationWorkflowService } from '../src/modules/orders/order-creation.workflow.service';
import { CreateOrderDto } from '../src/modules/orders/dto/create-order.dto';
import { IdempotencyService } from '../src/common/services/idempotency.service';
import { IdempotencyOperation } from '../src/common/entities/idempotency-operation.entity';

const TEST_TIMEOUT_MS = 10_000;
const RUN_ID = `point-concurrency-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function barrier(participants: number): () => Promise<void> {
  let waiting = 0;
  let release!: () => void;
  const allReady = new Promise<void>((resolve) => {
    release = resolve;
  });

  return () => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('concurrent point-spend barrier timed out')), TEST_TIMEOUT_MS);
    waiting += 1;
    if (waiting === participants) release();
    allReady.then(
      () => {
        clearTimeout(timeout);
        resolve();
      },
      reject,
    );
  });
}

describe('point spending concurrency (MySQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let pointsService: PointsService;
  let workflow: OrderCreationWorkflowService;
  let idempotency: IdempotencyService;
  let user: User;
  let product: Product;

  const pointDescription = (intent: string) => `${RUN_ID}:${intent}`;

  const createOrderDto = (): CreateOrderDto => ({
    items: [{ productId: 0, quantity: 1 }],
    recipientName: '동시성 테스트',
    recipientPhone: '010-0000-0000',
    zipcode: '12345',
    address: '서울특별시 테스트구 테스트로 1',
    pointsUsed: 60,
  });

  async function credit(amount: number): Promise<void> {
    await dataSource.transaction(async (manager) => {
      await pointsService.creditFifo(
        manager,
        Number(user.id),
        amount,
        pointDescription('credit'),
        new Date(Date.now() + 60_000),
      );
    });
  }

  async function clearScenario(): Promise<void> {
    const orders = await dataSource.getRepository(Order).find({
      where: { userId: Number(user.id) },
      select: { id: true },
    });
    if (orders.length > 0) {
      const orderIds = orders.map((order) => Number(order.id));
      await dataSource
        .createQueryBuilder()
        .delete()
        .from(OrderItem)
        .where('order_id IN (:...orderIds)', { orderIds })
        .execute();
      await dataSource.getRepository(Order).delete(orderIds);
    }
    await dataSource.getRepository(PointHistory).delete({ userId: Number(user.id) });
    await dataSource.getRepository(IdempotencyOperation)
      .createQueryBuilder()
      .delete()
      .where('scope LIKE :scope', { scope: `${RUN_ID}:%` })
      .execute();
    await dataSource.getRepository(Product).update(product.id, { stock: 2 });
  }

  async function runOrderIntent(
    intent: string,
    waitAtBarrier: () => Promise<void>,
  ): Promise<{ intent: string; committed: boolean; error?: unknown }> {
    const runner: QueryRunner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await waitAtBarrier();
      const dto = createOrderDto();
      dto.items[0].productId = Number(product.id);
      await workflow.runCreateOrderTransaction(runner.manager, Number(user.id), dto, 60);
      await runner.commitTransaction();
      return { intent, committed: true };
    } catch (error) {
      await runner.rollbackTransaction();
      return { intent, committed: false, error };
    } finally {
      await runner.release();
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    pointsService = app.get(PointsService);
    workflow = app.get(OrderCreationWorkflowService);
    idempotency = app.get(IdempotencyService);
    user = await dataSource.getRepository(User).save({
      email: `${RUN_ID}@example.test`,
      password: null,
      name: '포인트 동시성 테스트',
      phone: null,
      role: UserRole.USER,
    });
    product = await dataSource.getRepository(Product).save({
      name: `${RUN_ID} product`,
      slug: RUN_ID,
      price: 100,
      salePrice: 100,
      stock: 2,
      status: ProductStatus.ACTIVE,
      isFreeShipping: true,
    });
  });

  beforeEach(async () => {
    await clearScenario();
  });

  afterAll(async () => {
    await clearScenario();
    await dataSource.getRepository(Product).delete(product.id);
    await dataSource.getRepository(User).delete(user.id);
    await app.close();
  });

  it('commits one of two overspending order intents and leaves the loser without order, inventory, or ledger effects', async () => {
    await credit(100);
    const waitAtBarrier = barrier(2);

    const outcomes = await Promise.all([
      runOrderIntent('first', waitAtBarrier),
      runOrderIntent('second', waitAtBarrier),
    ]);

    const winners = outcomes.filter((outcome) => outcome.committed);
    const losers = outcomes.filter((outcome) => !outcome.committed);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect((losers[0].error as Error).message).toContain('적립금이 부족합니다.');

    const lot = await dataSource.getRepository(PointHistory).findOneByOrFail({
      userId: Number(user.id),
      type: 'earn',
    });
    const history = await dataSource.getRepository(PointHistory).find({
      where: { userId: Number(user.id) },
    });
    const orders = await dataSource.getRepository(Order).find({ where: { userId: Number(user.id) } });
    const reloadedProduct = await dataSource.getRepository(Product).findOneByOrFail({ id: product.id });
    const effective = await pointsService.getUserPointBalance(Number(user.id));
    const running = await dataSource.transaction((manager) => (
      pointsService.getRunningBalanceInTx(manager, Number(user.id))
    ));

    expect(orders).toHaveLength(1);
    expect(reloadedProduct.stock).toBe(1);
    expect(history.filter((entry) => entry.type === 'spend')).toHaveLength(1);
    expect(Number(lot.remainingAmount)).toBe(40);
    expect(effective).toBe(40);
    expect(running).toBe(40);
    expect(history.every((entry) => Number(entry.balance) >= 0)).toBe(true);
    expect(running).toBeGreaterThanOrEqual(0);
    expect(effective).toBeGreaterThanOrEqual(0);
  });

  it('allows an exact-balance deduction without a negative lot or ledger balance', async () => {
    await credit(100);

    await dataSource.transaction((manager) => pointsService.deductFifo(
      manager,
      Number(user.id),
      100,
      pointDescription('exact-balance'),
    ));

    const [lot, history] = await Promise.all([
      dataSource.getRepository(PointHistory).findOneByOrFail({ userId: Number(user.id), type: 'earn' }),
      dataSource.getRepository(PointHistory).find({ where: { userId: Number(user.id) } }),
    ]);
    expect(Number(lot.remainingAmount)).toBe(0);
    expect(await pointsService.getUserPointBalance(Number(user.id))).toBe(0);
    expect(history.every((entry) => Number(entry.balance) >= 0)).toBe(true);
  });

  it('rolls back a point deduction and its lot mutation together', async () => {
    await credit(100);

    await expect(dataSource.transaction(async (manager) => {
      await pointsService.deductFifo(manager, Number(user.id), 60, pointDescription('rollback'));
      throw new Error('force rollback');
    })).rejects.toThrow('force rollback');

    const history = await dataSource.getRepository(PointHistory).find({ where: { userId: Number(user.id) } });
    expect(history).toHaveLength(1);
    expect(Number(history[0].remainingAmount)).toBe(100);
    expect(await pointsService.getUserPointBalance(Number(user.id))).toBe(100);
  });

  it('replays the same idempotency key without deducting points again', async () => {
    await credit(100);
    const scope = `${RUN_ID}:replay`;
    const payload = { pointsUsed: 60 };
    const work = async (manager: QueryRunner['manager']) => {
      await pointsService.deductFifo(manager, Number(user.id), 60, pointDescription('replay'));
      return { pointsUsed: 60 };
    };

    const first = await idempotency.execute(scope, 'order.create', 'same-key', payload, work);
    const replay = await idempotency.execute(scope, 'order.create', 'same-key', payload, work);
    const history = await dataSource.getRepository(PointHistory).find({ where: { userId: Number(user.id) } });

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(history.filter((entry) => entry.type === 'spend')).toHaveLength(1);
    expect(await pointsService.getUserPointBalance(Number(user.id))).toBe(40);
  });
});
