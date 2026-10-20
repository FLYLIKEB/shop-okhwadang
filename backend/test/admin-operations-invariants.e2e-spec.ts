import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { Order, OrderStatus } from '../src/modules/orders/entities/order.entity';
import { OrderServiceRequest, OrderServiceRequestStatus, OrderServiceRequestType } from '../src/modules/orders/entities/order-service-request.entity';
import { Payment, PaymentGatewayType, PaymentStatus } from '../src/modules/payments/entities/payment.entity';
import { Refund, RefundStatus } from '../src/modules/payments/entities/refund.entity';
import { Shipping } from '../src/modules/payments/entities/shipping.entity';
import { MockPaymentAdapter } from '../src/modules/payments/adapters/mock.adapter';
import { AuditLog } from '../src/modules/audit-logs/entities/audit-log.entity';
import { MessageEffectOutbox } from '../src/modules/notification/entities/message-effect-outbox.entity';
import { AdminExportService } from '../src/modules/admin/admin-export.service';
import { PassThrough } from 'stream';
import * as ExcelJS from 'exceljs';

const RUN = `operations-${Date.now()}`;

describe('admin operations invariants (MySQL and HTTP)', () => {
  let app: INestApplication;
  let db: DataSource;
  let admin: User;
  let cookie: string;
  const orderIds: number[] = [];
  const paymentIds: number[] = [];

  async function fixture(status = OrderStatus.PENDING, paymentStatus = PaymentStatus.PENDING) {
    const order = await db.getRepository(Order).save(db.getRepository(Order).create({
      userId: Number(admin.id), orderNumber: `${RUN}-${orderIds.length}`, orderLocale: 'ko', status,
      totalAmount: 10000, discountAmount: 0, shippingFee: 0, pointsUsed: 0,
      recipientName: 'Operations test', recipientPhone: '01000000000', zipcode: '00000', address: 'Test address',
    }));
    orderIds.push(Number(order.id));
    const payment = await db.getRepository(Payment).save(db.getRepository(Payment).create({
      orderId: Number(order.id), amount: 10000, status: paymentStatus,
      gateway: PaymentGatewayType.MOCK, paymentKey: `mock-${order.orderNumber}`,
    }));
    paymentIds.push(Number(payment.id));
    return { order, payment };
  }

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!url.pathname.endsWith('_test')) throw new Error('Operations tests require a dedicated _test database');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(DataSource);
    admin = await db.getRepository(User).save(db.getRepository(User).create({
      email: `${RUN}@example.test`, name: 'Operations admin', role: UserRole.ADMIN,
      isActive: true, isEmailVerified: true, emailVerifiedAt: new Date(), tier: 'Bronze', tierAccumulatedAmount: 0,
    }));
    cookie = `accessToken=${app.get(JwtService).sign({
      sub: Number(admin.id), email: admin.email, role: admin.role, tokenType: 'access', jti: RUN,
    })}`;
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (db) {
      if (paymentIds.length) await db.getRepository(Refund).delete({ paymentId: In(paymentIds) });
      if (orderIds.length) {
        await db.getRepository(MessageEffectOutbox).delete({ orderId: In(orderIds) });
        await db.getRepository(OrderServiceRequest).delete({ orderId: In(orderIds) });
        await db.getRepository(Shipping).delete({ orderId: In(orderIds) });
        await db.getRepository(Payment).delete({ orderId: In(orderIds) });
        await db.getRepository(Order).delete({ id: In(orderIds) });
      }
      if (admin) {
        await db.getRepository(AuditLog).delete({ actorId: Number(admin.id) });
        await db.getRepository(User).delete({ id: Number(admin.id) });
      }
    }
    await app?.close();
  });

  it.each(['csv', 'xlsx'] as const)('includes the entire final day and excludes adjacent dates in %s exports', async (format) => {
    const timestamps = [
      '2024-12-30 23:59:59.999999', '2024-12-31 00:00:00',
      '2024-12-31 23:59:59', '2024-12-31 23:59:59.999999', '2025-01-01 00:00:00',
    ];
    const numbers: string[] = [];
    for (const timestamp of timestamps) {
      const { order } = await fixture();
      await db.query('UPDATE orders SET created_at = ? WHERE id = ?', [timestamp, order.id]);
      numbers.push(order.orderNumber);
    }
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<void>((resolve) => stream.on('end', resolve));
    await app.get(AdminExportService).exportOrders({ format, from: '2024-12-31', to: '2024-12-31' },
      Object.assign(stream, { setHeader: jest.fn() }) as unknown as import('express').Response);
    await finished;
    let output = Buffer.concat(chunks).toString();
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.concat(chunks));
      output = JSON.stringify(workbook.worksheets[0].getSheetValues());
    }
    for (const index of [1, 2, 3]) expect(output).toContain(numbers[index]);
    for (const index of [0, 4]) expect(output).not.toContain(numbers[index]);
  });

  it('rejects an unconfirmed paid transition and allows confirmed payment through shipping registration', async () => {
    const { order, payment } = await fixture();
    await request(app.getHttpServer()).patch(`/api/admin/orders/${order.id}`)
      .set('Cookie', cookie).send({ status: 'paid' }).expect(400);
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.PENDING);
    expect((await db.getRepository(Payment).findOneByOrFail({ id: payment.id })).status).toBe(PaymentStatus.PENDING);
    await db.getRepository(Payment).update(payment.id, { status: PaymentStatus.CONFIRMED });
    await request(app.getHttpServer()).patch(`/api/admin/orders/${order.id}`)
      .set('Cookie', cookie).send({ status: 'paid' }).expect(200);
    await request(app.getHttpServer()).post(`/api/admin/shipping/${order.id}`)
      .set('Cookie', cookie).send({ carrier: 'cj', trackingNumber: '123456789012' }).expect(201);
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.PREPARING);
  });

  it('paginates 11 active requests and keeps approved cancellation reachable until exactly one gateway cancellation', async () => {
    const requestIds: number[] = [];
    for (let index = 0; index < 11; index += 1) {
      const { order } = await fixture(OrderStatus.PAID, PaymentStatus.CONFIRMED);
      const saved = await db.getRepository(OrderServiceRequest).save(db.getRepository(OrderServiceRequest).create({
        orderId: Number(order.id), userId: Number(admin.id), type: OrderServiceRequestType.CANCEL,
        status: OrderServiceRequestStatus.REQUESTED, reason: `${RUN}-${index}`,
      }));
      requestIds.push(Number(saved.id));
    }
    const first = await request(app.getHttpServer()).get('/api/admin/order-service-requests?status=requested&page=1&limit=10')
      .set('Cookie', cookie).expect(200);
    const second = await request(app.getHttpServer()).get('/api/admin/order-service-requests?status=requested&page=2&limit=10')
      .set('Cookie', cookie).expect(200);
    const listed = [...first.body.items, ...second.body.items] as Array<{ id: number | string }>;
    expect(listed.map((row) => Number(row.id))).toEqual(expect.arrayContaining(requestIds));
    const id = requestIds[0];
    const cancel = jest.spyOn(app.get(MockPaymentAdapter), 'cancel');
    await request(app.getHttpServer()).patch(`/api/admin/order-service-requests/${id}`)
      .set('Cookie', cookie).send({ status: 'approved' }).expect(200);
    expect(cancel).not.toHaveBeenCalled();
    const approved = await request(app.getHttpServer()).get('/api/admin/order-service-requests?status=approved&limit=100')
      .set('Cookie', cookie).expect(200);
    expect((approved.body.items as Array<{ id: number | string }>).some((row) => Number(row.id) === id)).toBe(true);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await request(app.getHttpServer()).patch(`/api/admin/order-service-requests/${id}`)
        .set('Cookie', cookie).send({ status: 'completed' }).expect(200);
    }
    expect(cancel).toHaveBeenCalledTimes(1);
    const completed = await db.getRepository(OrderServiceRequest).findOneByOrFail({ id });
    expect(completed.status).toBe(OrderServiceRequestStatus.COMPLETED);
    expect((await db.getRepository(Payment).findOneByOrFail({ orderId: completed.orderId })).status).toBe(PaymentStatus.CANCELLED);
  });

  it.each([PaymentStatus.CANCELLED, PaymentStatus.REFUNDED])('failed reconciliation cannot resurrect %s payment', async (status) => {
    const orderStatus = status === PaymentStatus.CANCELLED ? OrderStatus.CANCELLED : OrderStatus.REFUNDED;
    const { order, payment } = await fixture(orderStatus, status);
    const refund = await db.getRepository(Refund).save(db.getRepository(Refund).create({
      paymentId: Number(payment.id), amount: 5000, reason: 'Failed partial refund',
      status: RefundStatus.FAILED, idempotencyKey: `${RUN}-${payment.id}`,
    }));
    const gateway = app.get(MockPaymentAdapter);
    const cancel = jest.spyOn(gateway, 'cancel');
    const partialCancel = jest.spyOn(gateway, 'partialCancel');
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await request(app.getHttpServer()).post(`/api/admin/orders/refunds/${refund.id}/reconcile`)
        .set('Cookie', cookie).send({
          outcome: 'failed', gatewayRefundId: `${RUN}-failed-${refund.id}`,
          verificationEvidence: 'Provider confirmed this partial refund was rejected',
        }).expect(201);
    }
    expect((await db.getRepository(Payment).findOneByOrFail({ id: payment.id })).status).toBe(status);
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe(orderStatus);
    expect(cancel).not.toHaveBeenCalled();
    expect(partialCancel).not.toHaveBeenCalled();
  });
});
