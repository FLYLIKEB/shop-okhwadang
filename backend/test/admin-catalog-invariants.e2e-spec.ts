import { BadRequestException, INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ProductCommandService } from '../src/modules/products/product-command.service';
import { ProductQueryService } from '../src/modules/products/product-query.service';
import { CategoriesService } from '../src/modules/products/categories.service';
import { AttributesService } from '../src/modules/products/attributes.service';
import { Product, ProductStatus } from '../src/modules/products/entities/product.entity';
import { ProductOption } from '../src/modules/products/entities/product-option.entity';
import { Category } from '../src/modules/products/entities/category.entity';
import { AttributeType } from '../src/modules/products/entities/attribute-type.entity';
import { ProductAttribute } from '../src/modules/products/entities/product-attribute.entity';
import { CartItem } from '../src/modules/cart/entities/cart-item.entity';
import { Order } from '../src/modules/orders/entities/order.entity';
import { OrderItem } from '../src/modules/orders/entities/order-item.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { RestockAlert } from '../src/modules/restock-alerts/entities/restock-alert.entity';
import { NotificationDispatchHelper } from '../src/modules/notification/notification-dispatch.helper';
import { CreateProductDto } from '../src/modules/products/dto/create-product.dto';

const RUN = `catalog-audit-${Date.now()}`;

describe('admin catalog invariants (MySQL)', () => {
  let app: INestApplication;
  let db: DataSource;
  let commands: ProductCommandService;
  let queries: ProductQueryService;
  let categories: CategoriesService;
  let attributes: AttributesService;
  let userId: number;
  let serial = 0;
  const productIds: number[] = [];
  const categoryIds: number[] = [];
  const typeIds: number[] = [];
  const orderIds: number[] = [];

  async function product(overrides: Partial<CreateProductDto> = {}) {
    const saved = await commands.create({
      name: '카탈로그 검증', slug: `${RUN}-${++serial}`, price: 1000,
      stock: 5, status: ProductStatus.ACTIVE, ...overrides,
    });
    productIds.push(Number(saved.id));
    return Number(saved.id);
  }

  async function category(parentId?: number) {
    const saved = await categories.create({ name: '검증 분류', slug: `${RUN}-${++serial}`, parentId });
    categoryIds.push(Number(saved.id));
    return Number(saved.id);
  }

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!url.pathname.endsWith('_test')) throw new Error('Catalog tests require a dedicated _test database');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DataSource);
    commands = app.get(ProductCommandService);
    queries = app.get(ProductQueryService);
    categories = app.get(CategoriesService);
    attributes = app.get(AttributesService);
    const saved = await db.getRepository(User).save(db.getRepository(User).create({
      email: `${RUN}@example.test`, name: '검증 계정', isActive: true,
      isEmailVerified: true, emailVerifiedAt: new Date(),
    }));
    userId = Number(saved.id);
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (db) {
      if (productIds.length) {
        await db.getRepository(CartItem).delete({ productId: In(productIds) });
        await db.getRepository(OrderItem).delete({ productId: In(productIds) });
        await db.getRepository(RestockAlert).delete({ productId: In(productIds) });
        await db.getRepository(Product).delete({ id: In(productIds) });
      }
      if (orderIds.length) await db.getRepository(Order).delete({ id: In(orderIds) });
      if (categoryIds.length) await db.getRepository(Category).delete({ id: In(categoryIds) });
      if (typeIds.length) await db.getRepository(AttributeType).delete({ id: In(typeIds) });
      if (userId) await db.getRepository(User).delete(userId);
    }
    if (app) await app.close();
  });

  it('retains cart and order option FKs through a rename and rejects referenced deletion', async () => {
    const productId = await product({ options: [{ name: '용량', value: '100ml', stock: 2 }] });
    const option = await db.getRepository(ProductOption).findOneByOrFail({ productId });
    const optionId = Number(option.id);
    await db.getRepository(CartItem).save({ userId, productId, productOptionId: optionId, quantity: 1 });
    const order = await db.getRepository(Order).save({
      userId, orderNumber: `${RUN}-${++serial}`, orderLocale: 'ko', totalAmount: 1000,
      recipientName: '검증', recipientPhone: '01000000000', zipcode: '00000', address: '테스트',
    });
    orderIds.push(Number(order.id));
    const item = await db.getRepository(OrderItem).save({
      orderId: Number(order.id), productId, productOptionId: optionId,
      productName: '주문 당시 상품', optionName: '용량 100ml', price: 1000, quantity: 1,
    });
    await commands.update(productId, { options: [{ id: optionId, name: '크기', value: '200ml', priceAdjustment: 300, stock: 4 }] });
    const renamed = await db.getRepository(ProductOption).findOneByOrFail({ id: optionId });
    expect(renamed).toMatchObject({ name: '크기', value: '200ml', stock: 4 });
    expect(Number(renamed.priceAdjustment)).toBe(300);
    expect(Number((await db.getRepository(CartItem).findOneByOrFail({ productId })).productOptionId)).toBe(optionId);
    expect(await db.getRepository(OrderItem).findOneByOrFail({ id: item.id })).toMatchObject({ productName: '주문 당시 상품', optionName: '용량 100ml' });
    await expect(commands.update(productId, { options: [] })).rejects.toThrow(BadRequestException);
    expect(await db.getRepository(ProductOption).countBy({ id: optionId })).toBe(1);
    await commands.update(productId, { options: [{ name: '크기', value: '200ml', stock: 4 }] });
    expect(await db.getRepository(ProductOption).countBy({ id: optionId })).toBe(1);
  });

  it('rejects foreign and repeated option IDs without changing the original option', async () => {
    const first = await product({ options: [{ name: 'size', value: 'one', stock: 2 }] });
    const second = await product({ options: [{ name: 'size', value: 'two', stock: 2 }] });
    const own = await db.getRepository(ProductOption).findOneByOrFail({ productId: first });
    const foreign = await db.getRepository(ProductOption).findOneByOrFail({ productId: second });
    await expect(commands.update(first, { options: [{ id: Number(foreign.id), name: 'foreign', value: 'x' }] })).rejects.toThrow(BadRequestException);
    await expect(commands.update(first, { options: [
      { id: Number(own.id), name: 'size', value: 'one' },
      { id: Number(own.id), name: 'size', value: 'three' },
    ] })).rejects.toThrow(BadRequestException);
    expect(await db.getRepository(ProductOption).findOneByOrFail({ id: own.id })).toMatchObject({ value: 'one', stock: 2 });
  });

  it('clears nullable fields in storage and public prices while omission preserves values', async () => {
    const productId = await product({ salePrice: 500, sku: `${RUN}-sku`, description: 'keep', nameEn: 'old' });
    expect(Number((await queries.findOne(productId)).salePrice)).toBe(500);
    await commands.update(productId, { salePrice: null, sku: null, nameEn: null });
    const read = await queries.findOne(productId);
    expect(read).toMatchObject({ salePrice: null, sku: null, nameEn: null, description: 'keep' });
    expect(Number(read.price)).toBe(1000);
    await commands.update(productId, { description: null });
    expect((await queries.findOne(productId)).description).toBeNull();
  });

  it('allows multiple missing or blank SKUs and clearing multiple populated SKUs', async () => {
    const missing = await product();
    const empty = await product({ sku: '' });
    const whitespace = await product({ sku: '   ' });
    const first = await product({ sku: `${RUN}-first` });
    const second = await product({ sku: `${RUN}-second` });
    await commands.update(first, { sku: '' });
    await commands.update(second, { sku: '   ' });
    for (const productId of [missing, empty, whitespace, first, second]) {
      expect((await db.getRepository(Product).findOneByOrFail({ id: productId })).sku).toBeNull();
    }
  });

  it('enforces cycle and subtree depth limits while accepting the third level', async () => {
    const root = await category();
    const child = await category(root);
    const leaf = await category(child);
    await expect(category(leaf)).rejects.toThrow(BadRequestException);
    await expect(categories.update(root, { parentId: child })).rejects.toThrow(BadRequestException);
    await expect(categories.update(root, { parentId: leaf })).rejects.toThrow(BadRequestException);
    const otherRoot = await category();
    const otherChild = await category(otherRoot);
    await expect(categories.update(root, { parentId: otherChild })).rejects.toThrow(BadRequestException);
    await categories.update(child, { parentId: otherRoot });
    expect(Number((await db.getRepository(Category).findOneByOrFail({ id: child })).parentId)).toBe(otherRoot);
  });

  it('preserves total101 on cold/warm lists and evicts all product readers when a category hides', async () => {
    const categoryId = await category();
    const rows = await db.getRepository(Product).save(Array.from({ length: 101 }, () => db.getRepository(Product).create({
      name: '페이지 검증', slug: `${RUN}-${++serial}`, price: 1000, categoryId,
      status: ProductStatus.ACTIVE, isVisibleKo: true,
    })));
    productIds.push(...rows.map((row) => Number(row.id)));
    const query = { categoryId, page: 1, limit: 20 };
    expect((await queries.findAll(query)).total).toBe(101);
    expect((await queries.findAll(query)).total).toBe(101);
    expect((await queries.findAll({ ...query, page: 2 })).items).toHaveLength(20);
    const productId = Number(rows[0].id);
    await queries.findOne(productId);
    await queries.findBulk([productId]);
    await categories.update(categoryId, { isActive: false });
    expect((await queries.findAll(query)).total).toBe(0);
    await expect(queries.findOne(productId)).rejects.toThrow(NotFoundException);
    expect(await queries.findBulk([productId])).toEqual([]);
    expect((await queries.findAll(query, true)).total).toBe(101);
  });

  it('evicts product attributes for edits, links, unlinks and type deletion without overwriting raw names', async () => {
    const productId = await product();
    const type = await attributes.createAttributeType({ code: `${RUN}-${++serial}`, name: 'Raw clay', nameKo: '니료', nameEn: 'Clay' });
    typeIds.push(Number(type.id));
    await attributes.createProductAttribute({ productId, attributeTypeId: type.id, value: 'one', displayValue: '처음' });
    await queries.findOne(productId);
    await queries.findBulk([productId]);
    await attributes.updateAttributeType(type.id, { nameKo: '새 니료', sortOrder: 2 });
    expect((await db.getRepository(AttributeType).findOneByOrFail({ id: type.id })).name).toBe('Raw clay');
    expect((await attributes.findAttributeTypeById(type.id)).name).toBe('새 니료');
    expect((await attributes.findAttributeTypeById(type.id, 'en')).name).toBe('Clay');
    expect((await queries.findOne(productId)).attributes[0].attributeType.nameKo).toBe('새 니료');
    await attributes.linkProductToAttributeValue(type.code, 'two', { productId });
    expect((await queries.findBulk([productId]))[0].attributes[0].value).toBe('two');
    await attributes.updateAttributeValueOption(type.code, 'two', { displayValue: '변경' });
    expect((await queries.findOne(productId)).attributes[0].displayValue).toBe('변경');
    await attributes.unlinkProductFromAttributeValue(type.code, 'two', productId);
    expect((await queries.findOne(productId)).attributes).toHaveLength(0);
    await attributes.createProductAttribute({ productId, attributeTypeId: type.id, value: 'three' });
    await queries.findOne(productId);
    await attributes.deleteAttributeType(type.id);
    expect((await queries.findOne(productId)).attributes).toHaveLength(0);
  });

  it('dispatches only matching option restock subscriptions once after commit and never after rollback', async () => {
    const productId = await product({ stock: 5, options: [
      { name: 'size', value: 'small', stock: 0 }, { name: 'size', value: 'large', stock: 0 },
    ] });
    const options = await db.getRepository(ProductOption).find({ where: { productId }, order: { id: 'ASC' } });
    const optionId = Number(options[0].id);
    const otherId = Number(options[1].id);
    const alerts = await db.getRepository(RestockAlert).save([
      { userId, productId, productOptionId: optionId },
      { userId, productId, productOptionId: otherId },
      { userId, productId, productOptionId: null },
    ]);
    const dispatch = jest.spyOn(app.get(NotificationDispatchHelper), 'dispatch').mockImplementation(async () => {
      expect((await db.getRepository(ProductOption).findOneByOrFail({ id: optionId })).stock).toBe(5);
    });
    const nextOptions = [
      { id: optionId, name: 'size', value: 'small', stock: 5 },
      { id: otherId, name: 'size', value: 'large', stock: 0 },
    ];
    await commands.update(productId, { options: nextOptions });
    await commands.update(productId, { options: nextOptions });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ resourceId: Number(alerts[0].id) }));
    expect((await db.getRepository(RestockAlert).findOneByOrFail({ id: alerts[1].id })).notifiedAt).toBeNull();
    expect((await db.getRepository(RestockAlert).findOneByOrFail({ id: alerts[2].id })).notifiedAt).toBeNull();
    await expect(commands.update(productId, {
      options: [nextOptions[0], { ...nextOptions[1], stock: 5 }],
      attributes: [{ attributeTypeId: 2147483647, value: 'invalid-fk' }],
    })).rejects.toThrow();
    expect((await db.getRepository(ProductOption).findOneByOrFail({ id: otherId })).stock).toBe(0);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(await db.getRepository(ProductAttribute).countBy({ productId })).toBe(0);
  });
});
