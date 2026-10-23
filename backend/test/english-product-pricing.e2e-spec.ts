import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ProductSort } from '../src/modules/products/dto/query-products.dto';
import { ProductCommandService } from '../src/modules/products/product-command.service';
import { CreateProductDto } from '../src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from '../src/modules/products/dto/update-product.dto';
import { Product, ProductStatus } from '../src/modules/products/entities/product.entity';
import { CheckoutPricingAuthorityInput, OrderCreationWorkflowService } from '../src/modules/orders/order-creation.workflow.service';
import { Order } from '../src/modules/orders/entities/order.entity';
import { OrderItem } from '../src/modules/orders/entities/order-item.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { PolicyConsent } from '../src/modules/pages/entities/policy-consent.entity';
import { currentPolicyConsents } from './helpers/policy-consent.helper';
import { getPricingKrwPerUsd } from '../src/common/utils/product-pricing.util';

const RUN = `english-pricing-${Date.now()}`;

describe('English product pricing (MySQL)', () => {
  let app: INestApplication;
  let db: DataSource;
  let commands: ProductCommandService;
  let workflow: OrderCreationWorkflowService;
  let userId: number;
  const productIds: number[] = [];
  const orderIds: number[] = [];
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  async function createProduct(overrides: Partial<CreateProductDto> = {}) {
    const product = await commands.create({
      name: 'English pricing test', slug: `${RUN}-${productIds.length}`, price: 30000,
      salePrice: 20000, stock: 20, status: ProductStatus.ACTIVE,
      isVisibleKo: true, isVisibleEn: true, isFreeShipping: true, ...overrides,
    });
    productIds.push(Number(product.id));
    return Number(product.id);
  }

  const preview = (input: CheckoutPricingAuthorityInput) => db.transaction(
    (manager) => workflow.previewPricing(manager, userId, input),
  );

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !url.pathname.endsWith('_test')) {
      throw new Error('English pricing tests require a local _test database');
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(pipe);
    await app.init();
    db = app.get(DataSource);
    commands = app.get(ProductCommandService);
    workflow = app.get(OrderCreationWorkflowService);
    const user = await db.getRepository(User).save({ email: `${RUN}@example.test`, name: 'Pricing test', isActive: true });
    userId = Number(user.id);
  });

  afterAll(async () => {
    if (db) {
      if (userId) await db.getRepository(PolicyConsent).delete({ userId });
      if (orderIds.length) {
        await db.getRepository(OrderItem).delete({ orderId: In(orderIds) });
        await db.getRepository(Order).delete({ id: In(orderIds) });
      }
      if (productIds.length) await db.getRepository(Product).delete({ id: In(productIds) });
      if (userId) await db.getRepository(User).delete(userId);
    }
    if (app) await app.close();
  });

  it('sorts and filters English listings using overrides and KRW fallbacks', async () => {
    const rate = getPricingKrwPerUsd();
    const name = `${RUN} listing`;
    const high = await createProduct({ name, price: 1000, salePrice: undefined, priceUsd: 50 });
    const low = await createProduct({ name, price: 90000, salePrice: undefined, priceUsd: 12, salePriceUsd: 10 });
    const middle = await createProduct({ name, price: Math.round(20 * rate), salePrice: undefined });
    const listing = async (query: Record<string, string | number>) => {
      const response = await request(app.getHttpServer()).get('/api/products').query(query).expect(200);
      return response.body as { items: { id: number }[] };
    };
    const input = { q: name, locale: 'en', limit: 100 };
    const ascending = await listing({ ...input, sort: ProductSort.PRICE_ASC });
    const descending = await listing({ ...input, sort: ProductSort.PRICE_DESC });
    expect(ascending.items.map((item) => Number(item.id))).toEqual([low, middle, high]);
    expect(descending.items.map((item) => Number(item.id))).toEqual([high, middle, low]);
    const filtered = await listing({ ...input, price_min: Math.round(15 * rate), price_max: Math.round(25 * rate) });
    expect(filtered.items.map((item) => Number(item.id))).toEqual([middle]);
  });

  it('persists cents, updates independently, and explicitly clears both USD values', async () => {
    const id = await createProduct({ priceUsd: 29.99, salePriceUsd: 19.95 });
    const read = () => db.getRepository(Product).findOneByOrFail({ id });
    expect(Number((await read()).priceUsd)).toBe(29.99);
    expect(Number((await read()).salePriceUsd)).toBe(19.95);
    await commands.update(id, { priceUsd: 31.25, salePriceUsd: null });
    const updated = await read();
    expect(Number(updated.priceUsd)).toBe(31.25);
    expect(updated.salePriceUsd).toBeNull();
    expect(Number(updated.salePrice)).toBe(20000);
    await commands.update(id, { priceUsd: null, salePriceUsd: null });
    expect(await read()).toMatchObject({ priceUsd: null, salePriceUsd: null });
  });

  it.each([
    { priceUsd: 0 }, { priceUsd: -1 }, { priceUsd: 1.001 },
    { priceUsd: '12.34' }, { salePriceUsd: -1 }, { salePriceUsd: 1.001 },
  ])('rejects invalid USD DTO input %j for create and update', async (fields) => {
    await expect(pipe.transform({ name: 'Invalid', slug: 'invalid', price: 1000, ...fields }, {
      type: 'body', metatype: CreateProductDto,
    })).rejects.toThrow();
    await expect(pipe.transform(fields, { type: 'body', metatype: UpdateProductDto })).rejects.toThrow();
  });

  it('rejects orphan and non-discount USD sales without mutating persisted prices', async () => {
    await expect(commands.create({ name: 'Invalid', slug: `${RUN}-orphan`, price: 1000, salePriceUsd: 1 })).rejects.toThrow();
    const id = await createProduct({ priceUsd: 10, salePriceUsd: 9 });
    await expect(commands.update(id, { salePriceUsd: 10 })).rejects.toThrow();
    await expect(commands.update(id, { salePriceUsd: 11 })).rejects.toThrow();
    const saved = await db.getRepository(Product).findOneByOrFail({ id });
    expect(Number(saved.priceUsd)).toBe(10);
    expect(Number(saved.salePriceUsd)).toBe(9);
    await commands.update(id, { priceUsd: null });
    expect(await db.getRepository(Product).findOneByOrFail({ id })).toMatchObject({ priceUsd: null, salePriceUsd: null });
  });

  it('uses the English base without leaking a Korean discount and freezes checkout snapshots', async () => {
    const id = await createProduct({ priceUsd: 29.99 });
    const rate = getPricingKrwPerUsd();
    const input = { items: [{ productId: id, quantity: 2 }], zipcode: '12345' };
    const en = await preview({ ...input, locale: 'en' });
    const ko = await preview({ ...input, locale: 'ko' });
    expect(en.items[0].unitPriceUsd).toBe(29.99);
    expect(en.items[0].unitPrice).toBe(Math.round(29.99 * rate));
    expect(en.totalUsd).toBe(59.98);
    expect(ko.items[0].unitPrice).toBe(20000);
    expect(ko.items[0].unitPriceUsd).toBeUndefined();
    const result = await db.transaction((manager) => workflow.runCreateOrderTransaction(manager, userId, {
      ...input, orderLocale: 'en', recipientName: 'Pricing test', recipientPhone: '01000000000',
      address: 'Test address', policyConsents: currentPolicyConsents,
    }, 0));
    const orderId = Number(result.savedOrder.id);
    orderIds.push(orderId);
    const saved = await db.getRepository(Order).findOneByOrFail({ id: orderId });
    const item = await db.getRepository(OrderItem).findOneByOrFail({ orderId });
    expect(Number(saved.pricingKrwPerUsd)).toBe(rate);
    expect(Number(saved.totalUsd)).toBe(59.98);
    expect(Number(saved.totalAmount)).toBe(en.totalPayable);
    expect(Number(item.priceUsd)).toBe(29.99);
    expect(Number(item.price)).toBe(en.items[0].unitPrice);
    await commands.update(id, { priceUsd: 99.99, salePriceUsd: 88.88 });
    expect(Number((await db.getRepository(OrderItem).findOneByOrFail({ orderId })).priceUsd)).toBe(29.99);
    expect(Number((await db.getRepository(Order).findOneByOrFail({ id: orderId })).totalUsd)).toBe(59.98);
  });

  it('applies English cents discounts and falls back to Korean pricing after USD values are cleared', async () => {
    const id = await createProduct({ priceUsd: 29.99, salePriceUsd: 19.95 });
    const input = { items: [{ productId: id, quantity: 3 }], zipcode: '12345', locale: 'en' as const };
    const discounted = await preview(input);
    expect(discounted.items[0].unitPriceUsd).toBe(19.95);
    expect(discounted.totalUsd).toBe(59.85);
    await commands.update(id, { priceUsd: null, salePriceUsd: null });
    const fallback = await preview(input);
    expect(fallback.items[0].unitPrice).toBe(20000);
    expect(fallback.items[0].unitPriceUsd).toBe(Math.round(20000 / getPricingKrwPerUsd() * 100) / 100);
  });
});
