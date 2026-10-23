import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})).join(', ')),
});

describe('product language policy DTOs', () => {
  it.each(['name', 'slug', 'price', 'stock', 'status', 'isFeatured', 'isFreeShipping', 'isVisibleKo', 'isVisibleEn', 'images', 'detailImages', 'options', 'attributes'])(
    'rejects null for nonnullable update field %s', async (field) => {
      await expect(validationPipe.transform({ [field]: null }, { type: 'body', metatype: UpdateProductDto })).rejects.toThrow(BadRequestException);
    },
  );

  it.each(['stock', 'status', 'isFeatured', 'isFreeShipping', 'images', 'detailImages', 'options', 'attributes'])(
    'rejects null for nonnullable create field %s', async (field) => {
      await expect(validationPipe.transform({ name: '상품', slug: 'product', price: 1000, [field]: null }, { type: 'body', metatype: CreateProductDto })).rejects.toThrow(BadRequestException);
    },
  );

  it.each([CreateProductDto, UpdateProductDto])('rejects fractional product and option stock in %p', async (metatype) => {
    const base = { name: '상품', slug: 'product', price: 1000 };
    await expect(validationPipe.transform({ ...base, stock: 1.5 }, { type: 'body', metatype })).rejects.toThrow(BadRequestException);
    await expect(validationPipe.transform({ ...base, categoryId: 1.5 }, { type: 'body', metatype })).rejects.toThrow(BadRequestException);
    await expect(validationPipe.transform({ ...base, options: [{ name: '크기', value: '소', stock: 1.5 }] }, { type: 'body', metatype })).rejects.toThrow(BadRequestException);
  });

  it('allows clearing nullable update fields and omitting all other fields', async () => {
    const payload = { categoryId: null, salePrice: null, sku: null, description: null, noticeInfo: null };
    await expect(validationPipe.transform(payload, { type: 'body', metatype: UpdateProductDto })).resolves.toEqual(payload);
  });

  it('rejects Japanese/Chinese product fields on create', async () => {
    await expect(
      validationPipe.transform(
        {
          name: '테스트 상품',
          slug: 'test-product',
          price: 1000,
          nameEn: 'Test product',
          nameJa: '日本語',
          nameZh: '中文',
        },
        { type: 'body', metatype: CreateProductDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects Japanese/Chinese product fields on update', async () => {
    await expect(
      validationPipe.transform(
        { descriptionJa: '日本語', shortDescriptionZh: '中文' },
        { type: 'body', metatype: UpdateProductDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
